import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LoginPageClient } from "./login-client";

export default async function LoginPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).login;
  return <LoginPageClient t={t} />;
}
