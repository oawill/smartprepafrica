"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Label, Input, FieldError } from "@/components/ui/form";
import { PhoneLoginForm } from "@/components/auth/phone-login-form";
import type { Dictionary } from "@/lib/i18n/messages/en";

function LoginForm({ t }: { t: Dictionary["login"] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const callbackUrl = searchParams.get("callbackUrl");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"email" | "phone">("email");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(t.invalidCredentials);
      return;
    }

    // Only ever follow a same-origin relative path (starts with "/", not
    // "//") — a callbackUrl is an untrusted query param, so anything else
    // would be an open-redirect vector.
    const isSafeRelativePath = !!callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//");
    router.push(isSafeRelativePath ? (callbackUrl as string) : "/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-8">
        <h1 className="text-h2 font-semibold text-text-primary">{t.welcomeBack}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t.logInToContinue}</p>

        {resetSuccess && (
          <p className="mt-4 rounded-lg border border-success/40 bg-success-surface px-3 py-2 text-sm text-success">
            {t.passwordResetSuccess}
          </p>
        )}

        {method === "email" ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">{t.email}</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t.password}</Label>
                <Link href="/forgot-password" className="text-xs text-brand-text hover:underline">
                  {t.forgotPassword}
                </Link>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>

            {error && <FieldError>{error}</FieldError>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60"
            >
              {loading ? t.signingIn : t.signIn}
            </button>
          </form>
        ) : (
          <div className="mt-6">
            <PhoneLoginForm callbackUrl={callbackUrl} t={t} />
          </div>
        )}

        <button
          type="button"
          onClick={() => setMethod(method === "email" ? "phone" : "email")}
          className="mt-4 w-full text-center text-xs text-brand-text hover:underline"
        >
          {method === "email" ? t.logInWithPhoneInstead : t.logInWithEmailInstead}
        </button>

        <p className="mt-6 text-center text-sm text-text-secondary">
          {t.noAccountYet}{" "}
          <Link href="/register" className="text-brand-text hover:underline">
            {t.createOne}
          </Link>
        </p>
      </div>
    </main>
  );
}

export function LoginPageClient({ t }: { t: Dictionary["login"] }) {
  return (
    <Suspense fallback={null}>
      <LoginForm t={t} />
    </Suspense>
  );
}
