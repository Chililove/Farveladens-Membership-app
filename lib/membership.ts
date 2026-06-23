// Config comes from env vars so nothing sensitive is hard-coded in the repo.
export const MEMBERSHIP_FEE_DKK = Number(process.env.MEMBERSHIP_FEE_DKK ?? 600);
export const MEMBERSHIP_PERIOD_MONTHS = Number(
  process.env.MEMBERSHIP_PERIOD_MONTHS ?? 6
);
export const MOBILEPAY_NUMBER =
  process.env.PAYMENT_MOBILEPAY_NUMBER ?? "(payment number not set)";

export type MembershipStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NONE";

export function getMembershipStatus(expiresAt: Date | null): MembershipStatus {
  if (!expiresAt) return "NONE";
  const now = new Date();
  if (expiresAt < now) return "EXPIRED";

  // Expiring soon = within the next 14 days.
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  if (expiresAt < soon) return "EXPIRING_SOON";

  return "ACTIVE";
}

// Extend from current expiry if still active, otherwise from today.
export function nextPeriodEnd(currentExpiry: Date | null): Date {
  const now = new Date();
  const base =
    currentExpiry && currentExpiry > now ? new Date(currentExpiry) : now;
  const end = new Date(base);
  end.setMonth(end.getMonth() + MEMBERSHIP_PERIOD_MONTHS);
  return end;
}
