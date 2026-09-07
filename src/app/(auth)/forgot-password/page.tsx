"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Label, Input, FieldError } from "@/components/ui/form";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "Unable to send code; please try again.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("resetEmail", email);
      router.push("/verify-reset-otp");
    } catch {
      setError("Unable to send code; please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-8">
        <h1 className="text-h2 font-semibold text-text-primary">Forgot password?</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Enter your registered email address and we&apos;ll send you a verification code.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && <FieldError>{error}</FieldError>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send Reset Code"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link href="/login" className="text-brand-text hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </main>
  );
}
