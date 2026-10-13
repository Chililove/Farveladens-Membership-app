// Onboarding: members accept the rules and give the name other members will
// see (on the booking calendar) before they can use the app.
//
// Members who accepted the rules before names existed land here once too, but
// only see the name question.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { membershipRepository } from "@/lib/repositories/membershipRepository";
import {
  NAME_MAX_LENGTH,
  needsOnboarding,
  normalizeName,
  safeNext,
} from "@/lib/onboarding";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { next: nextParam, error } = await searchParams;
  const next = safeNext(nextParam);

  const user = await membershipRepository.findUserById(session.user.id);
  if (!user) redirect("/login");
  // All done? No need to see this again.
  if (!needsOnboarding(user)) redirect(next);

  const onlyName = Boolean(user.rulesAcceptedAt);
  const { t } = await getI18n();

  async function complete(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) redirect("/login");

    const target = safeNext(formData.get("next"));
    const name = normalizeName(formData.get("name"));
    if (!name) {
      redirect(`/rules?error=name&next=${encodeURIComponent(target)}`);
    }

    const current = await membershipRepository.findUserById(s.user.id);
    if (current?.rulesAcceptedAt) {
      // Keep the original acceptance date; it's the audit trail.
      await membershipRepository.setName(s.user.id, name);
    } else {
      await membershipRepository.acceptRules(s.user.id, name);
    }
    redirect(target);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">
        {onlyName ? t.rules.titleName : t.rules.titleWelcome}
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {onlyName ? t.rules.introName : t.rules.introWelcome}
      </p>

      <form action={complete} className="mt-8">
        <input type="hidden" name="next" value={next} />

        <label className="block">
          <span className="font-medium">{t.rules.nameLabel}</span>
          <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
            {t.rules.nameHelp}
          </span>
          <input
            name="name"
            type="text"
            required
            maxLength={NAME_MAX_LENGTH}
            autoComplete="name"
            defaultValue={user.name ?? ""}
            placeholder={t.rules.namePlaceholder}
            className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-violet-500"
          />
        </label>
        {error === "name" && (
          <p className="mt-2 text-sm text-red-700 dark:text-red-400">
            {t.rules.nameError}
          </p>
        )}

        {!onlyName && (
          <>
            <h2 className="mt-10 text-xl font-semibold">{t.rules.rulesTitle}</h2>
            {/* TODO: replace this placeholder with Farveladen's real rules. */}
            <div className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-white p-6 text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
              {t.rules.rules.map((rule) => (
                <p key={rule}>{rule}</p>
              ))}
            </div>

            <h3 className="mt-8 font-semibold">{t.rules.bookingRulesTitle}</h3>
            <ul className="mt-3 list-disc space-y-2 rounded-xl border border-gray-200 bg-white p-6 pl-10 text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
              {t.rules.bookingRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </>
        )}

        <button
          type="submit"
          className="mt-8 rounded-full bg-violet-600 px-8 py-3 font-medium text-white transition hover:bg-violet-500"
        >
          {onlyName ? t.rules.saveContinue : t.rules.accept}
        </button>
      </form>
    </main>
  );
}
