"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Label, Input, FieldError } from "@/components/ui/form";
import { PasswordStrength } from "@/components/ui/password-strength";
import { passwordMeetsPolicy } from "@/lib/password-policy";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("resetEmail");
    if (!stored) {
      router.replace("/forgot-password");
      return;
    }
    setEmail(stored);
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!passwordMeetsPolicy(password)) {
      setError("Password does not meet the requirements below.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword: password, confirmPassword }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "Unable to reset password. Please try again.");
        setLoading(false);
        return;
      }

      sessionStorage.removeItem("resetEmail");
      setSuccess(true);
      setTimeout(() => router.push("/login?reset=success"), 1500);
    } catch {
      setError("Unable to reset password. Please try again.");
      setLoading(false);
    }
  }

  if (!email) return null;

  if (success) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-8 text-center">
          <h1 className="text-h2 font-semibold text-text-primary">Password reset successful</h1>
          <p className="mt-2 text-sm text-text-secondary">
            You can now sign in with your new password.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-8">
        <h1 className="text-h2 font-semibold text-text-primary">Reset your password</h1>
        <p className="mt-1 text-sm text-text-secondary">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-text-primary"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-16"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-text-primary"
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && <FieldError>{error}</FieldError>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Resetting…" : "Reset Password"}
          </button>
        </form>
      </div>
    </main>
  );
}
