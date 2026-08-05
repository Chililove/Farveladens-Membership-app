// Minimal Resend client. Uses the same API key as the magic-link login, via
// fetch rather than the SDK so there's no extra dependency.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function sendEmail(options: {
  to: string[];
  subject: string;
  html: string;
}): Promise<SendResult> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) return { ok: false, error: "AUTH_RESEND_KEY is not set" };
  if (options.to.length === 0) return { ok: false, error: "No recipients" };

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Same fallback as auth.ts: onboarding@resend.dev only reaches the
      // Resend account owner until a domain is verified.
      from: process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev",
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    id?: string;
    message?: string;
  } | null;

  if (!response.ok) {
    return {
      ok: false,
      error: payload?.message ?? `Resend returned ${response.status}`,
    };
  }

  return { ok: true, id: payload?.id ?? "unknown" };
}
