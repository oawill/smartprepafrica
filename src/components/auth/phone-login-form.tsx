"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input, FieldError } from "@/components/ui/form";
import { OtpInput } from "@/components/ui/otp-input";

/** Log in with an already-registered phone (Door 1 — see
 * docs/migration-plan.md Revised Phase 3). Deliberately sends no
 * name/email/agreeToTerms — the "phone-otp" provider in src/lib/auth.ts
 * only creates an account when those are present, so an unregistered
 * phone here correctly fails rather than silently signing someone up. */
export function PhoneLoginForm({ callbackUrl }: { callbackUrl: string | null }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    const res = await fetch("/api/auth/phone/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    setSending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not send code.");
      return;
    }

    setCodeSent(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn("phone-otp", { phone, code: code.join(""), redirect: false });

    setSubmitting(false);

    if (result?.error) {
      setError("No account found for this phone, or the code is invalid/expired.");
      return;
    }

    const isSafeRelativePath = !!callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//");
    router.push(isSafeRelativePath ? (callbackUrl as string) : "/dashboard");
  }

  if (!codeSent) {
    return (
      <form onSubmit={handleSendCode} className="space-y-4">
        <div>
          <Input
            type="tel"
            required
            placeholder="e.g. +2348012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {error && <FieldError>{error}</FieldError>}

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60"
        >
          {sending ? "Sending code…" : "Send code"}
        </button>

        <p className="text-center text-xs text-text-secondary">
          Lost access to this phone?{" "}
          <Link href="/forgot-password" className="text-brand-text hover:underline">
            Recover via email
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm text-text-secondary">
          Enter the code sent to <strong>{phone}</strong>.{" "}
          <button type="button" onClick={() => setCodeSent(false)} className="text-brand-text hover:underline">
            Change number
          </button>
        </p>
        <div className="mt-2">
          <OtpInput value={code} onChange={setCode} />
        </div>
      </div>

      {error && (
        <FieldError>
          {error}{" "}
          <Link href="/register" className="hover:underline">
            Sign up instead
          </Link>
        </FieldError>
      )}

      <button
        type="submit"
        disabled={submitting || code.join("").length !== 6}
        className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
