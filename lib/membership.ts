export const MOBILEPAY_NUMBER =
  process.env.PAYMENT_MOBILEPAY_NUMBER ?? "(payment number not set)";

// The membership plans members can choose from.
export type MembershipPlan = {
  id: string;
  label: string;
  amountDkk: number;
  months: number;
};

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  { id: "monthly", label: "1 month", amountDkk: 100, months: 1 },
  { id: "biannual", label: "6 months", amountDkk: 600, months: 6 },
  { id: "annual", label: "1 year", amountDkk: 1200, months: 12 },
];

export function getPlan(id: string): MembershipPlan | undefined {
  return MEMBERSHIP_PLANS.find((plan) => plan.id === id);
}

export type MembershipStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NONE";

// How far ahead counts as "expiring soon". Shared with the admin digest so the
// dashboard warning and the email agree on what's urgent.
export const EXPIRING_SOON_DAYS = 14;

export function expiringSoonCutoff(): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + EXPIRING_SOON_DAYS);
  return cutoff;
}

export function getMembershipStatus(expiresAt: Date | null): MembershipStatus {
  if (!expiresAt) return "NONE";
  const now = new Date();
  if (expiresAt < now) return "EXPIRED";
  if (expiresAt < expiringSoonCutoff()) return "EXPIRING_SOON";

  return "ACTIVE";
}

// Extend from current expiry if still active, otherwise from today.
export function nextPeriodEnd(currentExpiry: Date | null, months: number): Date {
  const now = new Date();
  const base =
    currentExpiry && currentExpiry > now ? new Date(currentExpiry) : now;
  const end = new Date(base);
  end.setMonth(end.getMonth() + months);
  return end;
}
