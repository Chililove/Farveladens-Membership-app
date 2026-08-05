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

  // Record that a member accepted the rules (timestamp doubles as the audit log).
  acceptRules(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { rulesAcceptedAt: new Date() },
    });
  },
};
