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

  // Admin pre-creates a member by email; they log in later via magic link.
  createMember(email: string) {
    return prisma.user.create({ data: { email } });
  },

  // Record that a member accepted the rules (timestamp doubles as the audit log).
  acceptRules(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { rulesAcceptedAt: new Date() },
    });
  },
};
