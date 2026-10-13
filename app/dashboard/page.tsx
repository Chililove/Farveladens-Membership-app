import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/auth";
import { membershipRepository } from "@/lib/repositories/membershipRepository";
import {
  getMembershipStatus,
  nextPeriodEnd,
  getPlan,
  MEMBERSHIP_PLANS,
  MOBILEPAY_NUMBER,
} from "@/lib/membership";
import {
  NAME_MAX_LENGTH,
  needsOnboarding,
  normalizeName,
  onboardingUrl,
} from "@/lib/onboarding";
import { getI18n } from "@/lib/i18n/server";
import { localeOf } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";


export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await membershipRepository.findUserWithPayments(session.user.id);
  if (!user) redirect("/login");

  // Must accept the rules and give a name before using the dashboard.
  if (needsOnboarding(user)) redirect(onboardingUrl("/dashboard"));

  const status = getMembershipStatus(user.membershipExpiresAt);
  const pending = user.payments.find((p) => p.status === "PENDING");

  const { lang, t } = await getI18n();
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(localeOf(lang), { dateStyle: "long" }).format(date);

  async function registerPayment(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) return;

    const plan = getPlan(String(formData.get("planId")));
    if (!plan) return; // ignore unknown/tampered plan ids

    // Only one pending payment allowed at a time.
    const existing = await membershipRepository.findPendingPayment(s.user.id);
    if (existing) return;

    await membershipRepository.createPendingPayment({
      userId: s.user.id,
      amountDkk: plan.amountDkk,
      periodEnd: nextPeriodEnd(s.user.membershipExpiresAt, plan.months),
      method: "MOBILEPAY",
    });
    revalidatePath("/dashboard");
  }

  async function updateName(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) return;
    const name = normalizeName(formData.get("name"));
    if (!name) return; // an empty name would just bounce them to onboarding
    await membershipRepository.setName(s.user.id, name);
    revalidatePath("/dashboard");
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">{t.dashboard.title}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t.dashboard.hi(user.name ?? "")} · {t.common.signedInAs(user.email)}
      </p>

      {/* No client JS needed: <details> opens and closes on its own. */}
      <details className="mt-1 text-sm">
        <summary className="cursor-pointer text-gray-500 underline underline-offset-2 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          {t.dashboard.changeName}
        </summary>
        <form action={updateName} className="mt-2 flex gap-2">
          <input
            name="name"
            type="text"
            required
            maxLength={NAME_MAX_LENGTH}
            defaultValue={user.name ?? ""}
            aria-label={t.dashboard.yourName}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-violet-500"
          />
          <button
            type="submit"
            className="rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            {t.common.save}
          </button>
        </form>
      </details>

      {user.role === "ADMIN" && (
        <Link
          href="/admin"
          className="mt-2 inline-block text-sm text-violet-700 underline underline-offset-2 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300"
        >
          {t.dashboard.goAdmin}
        </Link>
      )}

      <Link
        href="/booking"
        className="mt-8 flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 p-5 transition hover:border-violet-400 dark:border-violet-500/30 dark:bg-violet-500/10 dark:hover:border-violet-500/60"
      >
        <span>
          <span className="block font-semibold">{t.dashboard.bookCardTitle}</span>
          <span className="block text-sm text-gray-600 dark:text-gray-400">
            {t.dashboard.bookCardText}
          </span>
        </span>
        <span aria-hidden className="text-violet-700 dark:text-violet-400">
          →
        </span>
      </Link>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/40">
        {status === "ACTIVE" && (
          <p className="text-green-700 dark:text-green-400">
            {t.dashboard.activeUntil}{" "}
            <strong>{formatDate(user.membershipExpiresAt!)}</strong>
          </p>
        )}
        {status === "EXPIRING_SOON" && (
          <p className="text-amber-700 dark:text-amber-400">
            {t.dashboard.expiringUntil}{" "}
            <strong>{formatDate(user.membershipExpiresAt!)}</strong>
          </p>
        )}
        {status === "EXPIRED" && (
          <p className="text-red-700 dark:text-red-400">
            {t.dashboard.expired}{" "}
            {user.membershipExpiresAt
              ? t.dashboard.expiredOn(formatDate(user.membershipExpiresAt))
              : ""}
          </p>
        )}
        {status === "NONE" && (
          <p className="text-gray-700 dark:text-gray-300">
            {t.dashboard.notMember}
          </p>
        )}
      </div>

      {pending ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
          <h2 className="font-semibold">{t.dashboard.pendingTitle}</h2>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {t.dashboard.pendingSend[0]} <strong>{pending.amountDkk} kr</strong>{" "}
            {t.dashboard.pendingSend[1]} <strong>{MOBILEPAY_NUMBER}</strong>
            {t.dashboard.pendingSend[2].startsWith(",") ? "" : " "}
            {t.dashboard.pendingSend[2]}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t.dashboard.pendingNote(formatDate(pending.periodEnd))}
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/40">
          <h2 className="font-semibold">
            {status === "NONE" ? t.dashboard.chooseJoin : t.dashboard.chooseRenew}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t.dashboard.planHelp}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {MEMBERSHIP_PLANS.map((plan) => (
              <form key={plan.id} action={registerPayment}>
                <input type="hidden" name="planId" value={plan.id} />
                <button
                  type="submit"
                  className="w-full rounded-xl border border-gray-300 p-4 text-left transition hover:border-violet-600 hover:bg-violet-50 dark:border-gray-700 dark:hover:border-violet-500 dark:hover:bg-violet-500/10"
                >
                  <span className="block text-lg font-semibold">
                    {plan.amountDkk} kr
                  </span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400">
                    {t.plans[plan.id] ?? plan.label}
                  </span>
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-10"
      >
        <button
          type="submit"
          className="text-sm text-gray-500 underline underline-offset-2 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          {t.common.signOut}
        </button>
      </form>
    </main>
  );
}
