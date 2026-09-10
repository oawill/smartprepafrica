import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { PublicHeaderClient } from "@/components/brand/public-header-client";

/** Resolves locale + dictionary here so every one of this component's
 * existing call sites keeps working unchanged (<PublicHeader /> with no
 * props) — the translated labels are handed down to the actual client
 * component (mobile menu, session-aware nav) as a prop. */
export async function PublicHeader() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return <PublicHeaderClient locale={locale} t={dict.header} />;
}
