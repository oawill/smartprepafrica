"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FieldError } from "@/components/ui/form";
import { OtpInput } from "@/components/ui/otp-input";

const RESEND_COOLDOWN_SEC = 60;

export default function VerifyResetOtpPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);

  useEffect(() => {
    const stored = sessionStorage.getItem("resetEmail");
    if (!stored) {
      router.replace("/forgot-password");
      return;
    }
    setEmail(stored);
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const otp = digits.join("");
    if (otp.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "Invalid or expired code.");
        setLoading(false);
        return;
      }

      router.push("/reset-password");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendMessage(null);
    setError(null);
    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/resend-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "Unable to send code; please try again.");
        setResendLoading(false);
        return;
      }

      setDigits(Array(6).fill(""));
      setResendMessage("A new code has been sent.");
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch {
      setError("Unable to send code; please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  if (!email) return null;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-8">
        <h1 className="text-h2 font-semibold text-text-primary">Verify Your Email</h1>
        <p className="mt-1 text-sm text-text-secondary">
          We sent a 6-digit verification code to your email address.
        </p>

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <OtpInput value={digits} onChange={setDigits} disabled={loading} error={error} />

          {error && <FieldError>{error}</FieldError>}
          {resendMessage && <p className="text-sm text-success">{resendMessage}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify Code"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {cooldown > 0 ? (
            <p className="text-text-muted">Resend code in {cooldown}s</p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-brand-text hover:underline disabled:opacity-60"
            >
              {resendLoading ? "Sending…" : "Resend Code"}
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link href="/login" className="text-brand-text hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </main>
  );
}
