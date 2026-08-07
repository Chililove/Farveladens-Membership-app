// Repository boundary: this is the only file that touches the database.

import prisma from "@/lib/prisma";

export const membershipRepository = {
  findUserWithPayments(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { payments: { orderBy: { createdAt: "desc" } } },
    });
  },

  findPendingPayment(userId: string) {
    return prisma.payment.findFirst({
      where: { userId, status: "PENDING" },
    });
  },

  createPendingPayment(data: {
    userId: string;
    amountDkk: number;
    periodEnd: Date;
    method: "MOBILEPAY" | "BANK_TRANSFER";
  }) {
    return prisma.payment.create({
      data: {
        userId: data.userId,
        amountDkk: data.amountDkk,
        periodEnd: data.periodEnd,
        method: data.method,
        status: "PENDING",
      },
    });
  },

  // ---- Admin ----

  findPendingPayments() {
    return prisma.payment.findMany({
      where: { status: "PENDING" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
  },

  findAllMembers() {
    return prisma.user.findMany({ orderBy: { email: "asc" } });
  },

  // Confirm a payment and extend the member's expiry together, in a single
  // transaction so a crash can't leave one done without the other.
  confirmPayment(paymentId: string) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status !== "PENDING") return null;

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
      await tx.user.update({
        where: { id: payment.userId },
        data: { membershipExpiresAt: payment.periodEnd },
      });
      return payment;
    });
  },

  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  // Admin pre-creates a member by email; they log in later via magic link.
  // Members added from a demo session are flagged so the next demo reset
  // removes them instead of leaving them in the real roster.
  createMember(email: string, isDemo = false) {
    return prisma.user.create({ data: { email, isDemo } });
  },

  // Record that a member accepted the rules (timestamp doubles as the audit log).
  acceptRules(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { rulesAcceptedAt: new Date() },
    });
  },

  // ---- Digest ----
  // These all skip demo accounts: the board's summary is about real members.

  // Still valid, but running out before `before`.
  findMembersExpiringBefore(before: Date) {
    return prisma.user.findMany({
      where: {
        isDemo: false,
        membershipExpiresAt: { gte: new Date(), lt: before },
      },
      orderBy: { membershipExpiresAt: "asc" },
    });
  },

  // Lapsed and not yet renewed.
  findExpiredMembers() {
    return prisma.user.findMany({
      where: { isDemo: false, membershipExpiresAt: { lt: new Date() } },
      orderBy: { membershipExpiresAt: "desc" },
    });
  },

  // Added by an admin but never paid a first subscription.
  findNeverPaidMembers() {
    return prisma.user.findMany({
      where: { isDemo: false, membershipExpiresAt: null },
      orderBy: { email: "asc" },
    });
  },

  // Every admin, used as the default digest recipient list.
  findAdmins() {
    return prisma.user.findMany({
      where: { isDemo: false, role: "ADMIN" },
      orderBy: { email: "asc" },
    });
  },
};
