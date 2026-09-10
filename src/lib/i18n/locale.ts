import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locale-constants";

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locale-constants";

/** Resolution order: an explicit sp-locale cookie (the user switched
 * languages) wins over everything else, matching sp-theme's precedence.
 * Otherwise, a logged-in user's Country.defaultLanguage (set at
 * registration via src/lib/registration/resolve-country.ts) is used.
 * Falls back to English. Uses cookies() rather than a URL/root-param
 * segment specifically so this same function works from Server
 * Components, Server Actions, AND Route Handlers — next/root-params
 * (the URL-based alternative) does not work in the latter two.
 *
 * Server-only (imports next/headers) — Client Components that only
 * need the locale constants/type should import from ./locale-constants
 * instead, since this file cannot be bundled for the browser. */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const explicit = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(explicit)) return explicit;

  const session = await auth();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { country: { select: { defaultLanguage: true } } },
    });
    if (isLocale(user?.country?.defaultLanguage)) return user.country.defaultLanguage;
  }

  return DEFAULT_LOCALE;
}
