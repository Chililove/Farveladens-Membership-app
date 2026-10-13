"use server";

// Switches the app's language. Setting a cookie in a server action makes Next
// re-render the current page, so it comes back in the new language without a
// reload or a redirect.

import { cookies } from "next/headers";
import { LANG_COOKIE, isLang } from "@/lib/i18n/config";

export async function setLanguage(formData: FormData) {
  const lang = formData.get("lang");
  if (!isLang(lang)) return;
  (await cookies()).set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // remembered for a year
    sameSite: "lax",
  });
}
