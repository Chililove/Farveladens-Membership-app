// Weekly summary emailed to the board: who is about to lapse, who already has,
// and which transfers are still waiting to be confirmed. Nothing here changes
// data - it only reports.

import { membershipRepository } from "./repositories/membershipRepository";
import { expiringSoonCutoff, EXPIRING_SOON_DAYS } from "./membership";

type MemberRow = { email: string; membershipExpiresAt: Date | null };
type PendingRow = { email: string; amountDkk: number; createdAt: Date };

export type Digest = {
  expiringSoon: MemberRow[];
  expired: MemberRow[];
  neverPaid: MemberRow[];
  pending: PendingRow[];
  isEmpty: boolean;
};

/**
 * ISO week number. Cron has no "every second week", so the job runs weekly and
 * only sends on even ISO weeks - giving an exact 14-day gap while staying on a
 * Monday morning. Swap to `0 7 1,15 * *` in vercel.json if you'd rather have it
 * twice a month on fixed dates.
 */
export function isoWeek(date = new Date()): number {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  // Thursday of the current week decides which year the week belongs to.
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function isDigestWeek(date = new Date()): boolean {
  return isoWeek(date) % 2 === 0;
}

function formatDate(date: Date | null): string {
  return date
    ? new Intl.DateTimeFormat("da-DK", { dateStyle: "medium" }).format(date)
    : "-";
}

function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** Gather everything the board needs to see. Demo accounts are left out. */
export async function collectDigest(): Promise<Digest> {
  const [expiringSoon, expired, neverPaid, pending] = await Promise.all([
    membershipRepository.findMembersExpiringBefore(expiringSoonCutoff()),
    membershipRepository.findExpiredMembers(),
    membershipRepository.findNeverPaidMembers(),
    // false = real members only, never demo data.
    membershipRepository.findPendingPayments(false),
  ]);

  const digest: Digest = {
    expiringSoon,
    expired,
    neverPaid,
    pending: pending.map((p) => ({
      email: p.user.email,
      amountDkk: p.amountDkk,
      createdAt: p.createdAt,
    })),
    isEmpty: false,
  };

  digest.isEmpty =
    digest.expiringSoon.length === 0 &&
    digest.expired.length === 0 &&
    digest.pending.length === 0;

  return digest;
}

/**
 * Who receives the digest.
 *
 * Defaults to every admin in the database, which is where this should end up
 * once the forening runs it themselves. ADMIN_DIGEST_EMAIL overrides that -
 * needed while Resend is in test mode and can only deliver to the account
 * owner's address.
 */
export async function digestRecipients(): Promise<string[]> {
  const override = process.env.ADMIN_DIGEST_EMAIL?.trim();
  if (override) return override.split(",").map((email) => email.trim());

  const admins = await membershipRepository.findAdmins();
  return admins.map((admin) => admin.email);
}

function section(title: string, rows: string[]): string {
  if (rows.length === 0) return "";
  return `
    <h2 style="font-size:16px;margin:24px 0 8px;">${title}</h2>
    <ul style="margin:0;padding-left:20px;line-height:1.6;">
      ${rows.map((row) => `<li>${row}</li>`).join("")}
    </ul>`;
}

export function renderDigestHtml(digest: Digest, appUrl: string): string {
  const body = digest.isEmpty
    ? `<p style="line-height:1.6;">Nothing needs attention this week - no lapsed
       members, nobody expiring within ${EXPIRING_SOON_DAYS} days, and no
       transfers waiting to be confirmed.</p>`
    : [
        section(
          `Waiting for confirmation (${digest.pending.length})`,
          digest.pending.map(
            (p) =>
              `<strong>${p.email}</strong> - ${p.amountDkk} kr, registered ${formatDate(p.createdAt)}`
          )
        ),
        section(
          `Expiring within ${EXPIRING_SOON_DAYS} days (${digest.expiringSoon.length})`,
          digest.expiringSoon.map(
            (m) =>
              `<strong>${m.email}</strong> - expires ${formatDate(m.membershipExpiresAt)} (${daysUntil(m.membershipExpiresAt!)} days)`
          )
        ),
        section(
          `Already expired (${digest.expired.length})`,
          digest.expired.map(
            (m) =>
              `<strong>${m.email}</strong> - expired ${formatDate(m.membershipExpiresAt)}`
          )
        ),
        section(
          `Never paid (${digest.neverPaid.length})`,
          digest.neverPaid.map((m) => m.email)
        ),
      ].join("");

  return `<!doctype html>
<html>
  <body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#171717;max-width:600px;margin:0 auto;padding:24px;">
    <h1 style="font-size:20px;margin:0 0 4px;">Farveladen - weekly membership summary</h1>
    <p style="color:#6b7280;margin:0 0 16px;font-size:14px;">
      ${formatDate(new Date())}
    </p>
    ${body}
    <p style="margin-top:28px;">
      <a href="${appUrl}/admin" style="color:#7c3aed;">Open the admin panel →</a>
    </p>
  </body>
</html>`;
}

export function digestSubject(digest: Digest): string {
  if (digest.isEmpty) return "Farveladen - nothing to action this week";

  const parts: string[] = [];
  if (digest.pending.length) parts.push(`${digest.pending.length} to confirm`);
  if (digest.expiringSoon.length)
    parts.push(`${digest.expiringSoon.length} expiring`);
  if (digest.expired.length) parts.push(`${digest.expired.length} expired`);

  return `Farveladen - ${parts.join(", ")}`;
}
