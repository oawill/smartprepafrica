/** No "next/headers"/prisma imports here — this file must be safe to
 * import from Client Components (e.g. LocaleToggle) as well as Server
 * Components. Server-only locale RESOLUTION (getLocale) lives in
 * ./locale.ts instead. */
export const SUPPORTED_LOCALES = ["en", "fr"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Same cookie mechanism as sp-theme (src/components/theme/theme-toggle.tsx)
 * — an explicit user choice, not a URL segment. See src/app/layout.tsx for
 * where this is read into <html lang>. */
export const LOCALE_COOKIE = "sp-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
