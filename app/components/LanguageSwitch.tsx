import { setLanguage } from "@/app/actions/language";
import { LANGS, type Lang } from "@/lib/i18n/config";

// DA | EN in the header. A plain form posting to a server action: no client
// JavaScript needed, and the page re-renders in the chosen language.
export default function LanguageSwitch({
  lang,
  label,
}: {
  lang: Lang;
  label: string;
}) {
  return (
    <form
      action={setLanguage}
      role="group"
      aria-label={label}
      className="inline-flex rounded-full border border-gray-300 bg-white/80 p-0.5 text-xs font-medium backdrop-blur dark:border-gray-700 dark:bg-gray-900/80"
    >
      {LANGS.map((option) => (
        <button
          key={option}
          type="submit"
          name="lang"
          value={option}
          aria-pressed={option === lang}
          lang={option}
          className={
            option === lang
              ? "rounded-full bg-gray-900 px-2.5 py-1.5 text-white dark:bg-gray-100 dark:text-gray-900"
              : "rounded-full px-2.5 py-1.5 text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          }
        >
          {option.toUpperCase()}
        </button>
      ))}
    </form>
  );
}
