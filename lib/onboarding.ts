// The steps a member goes through before using the app: accept the rules and
// tell us their name. Checked by every member-facing page.

export const NAME_MAX_LENGTH = 50;

/** Trimmed, single-spaced, capped. Undefined if nothing usable is left. */
export function normalizeName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.trim().replace(/\s+/g, " ").slice(0, NAME_MAX_LENGTH).trim();
  return name || undefined;
}

/** True until the member has both accepted the rules and given a name. */
export function needsOnboarding(user: {
  rulesAcceptedAt: Date | null;
  name: string | null;
}): boolean {
  return !user.rulesAcceptedAt || !user.name;
}

/** The onboarding page, remembering where to go afterwards. */
export function onboardingUrl(next: string): string {
  return next === "/dashboard"
    ? "/rules"
    : `/rules?next=${encodeURIComponent(next)}`;
}

/**
 * A path to continue to after login or onboarding. Only same-site paths are
 * accepted, so the parameter can't be used to bounce people to another site.
 */
export function safeNext(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/dashboard";
  }
  return value;
}
