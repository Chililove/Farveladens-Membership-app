// Languages the app speaks. Danish is the default: it's what members see
// before they've chosen anything, including on the login page.

export const LANGS = ["da", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "da";

// The visitor's choice lives in a cookie, so server components can read it
// and pages render in the right language straight away, without a flash.
export const LANG_COOKIE = "lang";

export function isLang(value: unknown): value is Lang {
  return LANGS.includes(value as Lang);
}

/** Locale for Intl date and number formatting. */
export function localeOf(lang: Lang): string {
  return lang === "da" ? "da-DK" : "en-GB";
}
