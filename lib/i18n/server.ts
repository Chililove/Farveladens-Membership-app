// Server-side language lookup, for server components and server actions.

import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from "./config";
import { dictionaries } from "./dictionaries";

export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

/** The current language and its texts, for a page to render with. */
export async function getI18n() {
  const lang = await getLang();
  return { lang, t: dictionaries[lang] };
}
