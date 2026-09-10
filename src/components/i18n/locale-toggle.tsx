"use client";

import { useRouter } from "next/navigation";
import { SUPPORTED_LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n/locale-constants";

const LOCALE_LABELS: Record<Locale, string> = { en: "EN", fr: "FR" };

function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

/** Mirrors src/components/theme/theme-toggle.tsx's cookie-set pattern.
 * Unlike theme (a pure CSS attribute flip), translated text is decided
 * server-side per request, so switching locale also needs router.refresh()
 * to actually re-render the page's Server Components in the new language. */
export function LocaleToggle({ current, className = "" }: { current: Locale; className?: string }) {
  const router = useRouter();

  function select(locale: Locale) {
    setLocaleCookie(locale);
    router.refresh();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className={`inline-flex items-center gap-0.5 rounded-full border border-border bg-surface-raised p-1 ${className}`}
    >
      {SUPPORTED_LOCALES.map((locale) => {
        const isActive = current === locale;
        return (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={LOCALE_LABELS[locale]}
            title={LOCALE_LABELS[locale]}
            onClick={() => select(locale)}
            className={`flex h-7 w-9 items-center justify-center rounded-full text-xs font-medium transition ${
              isActive
                ? "bg-brand text-brand-foreground"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {LOCALE_LABELS[locale]}
          </button>
        );
      })}
    </div>
  );
}
