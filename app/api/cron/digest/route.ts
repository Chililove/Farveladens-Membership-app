// Weekly admin digest, triggered by the Vercel cron entry in vercel.json.
//
// Vercel sends "Authorization: Bearer $CRON_SECRET" automatically when that
// environment variable is set, so the same check works for a manual curl:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/digest
//
// TODO: member-facing reminders ("your membership expires in 14 days") belong
// here too, but they can't be sent until a domain is verified in Resend —
// test mode only delivers to the account owner's own address.

import { NextResponse } from "next/server";
import {
  collectDigest,
  digestRecipients,
  digestSubject,
  isDigestWeek,
  isoWeek,
  renderDigestHtml,
} from "@/lib/digest";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The cron fires weekly; only even ISO weeks actually send, making it
  // fortnightly. ?force=1 bypasses this so you can test on any week.
  const force = new URL(request.url).searchParams.get("force") === "1";
  if (!force && !isDigestWeek()) {
    return NextResponse.json({
      sent: false,
      reason: `Week ${isoWeek()} is an off week — digest runs every second week`,
    });
  }

  const digest = await collectDigest();
  const recipients = await digestRecipients();

  if (recipients.length === 0) {
    return NextResponse.json(
      { sent: false, reason: "No recipients — set ADMIN_DIGEST_EMAIL or add an admin" },
      { status: 200 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  const result = await sendEmail({
    to: recipients,
    subject: digestSubject(digest),
    html: renderDigestHtml(digest, appUrl),
  });

  if (!result.ok) {
    // Surface the failure so a bad key or unverified domain doesn't fail silently.
    return NextResponse.json({ sent: false, error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    sent: true,
    id: result.id,
    recipients: recipients.length,
    counts: {
      pending: digest.pending.length,
      expiringSoon: digest.expiringSoon.length,
      expired: digest.expired.length,
      neverPaid: digest.neverPaid.length,
    },
  });
}
