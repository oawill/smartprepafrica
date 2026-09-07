"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Label, Input, FieldError } from "@/components/ui/form";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setError("Invalid email or password.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-8">
        <h1 className="text-h2 font-semibold text-text-primary">Welcome back</h1>
        <p className="mt-1 text-sm text-text-secondary">Log in to continue your prep.</p>

        {resetSuccess && (
          <p className="mt-4 rounded-lg border border-success/40 bg-success-surface px-3 py-2 text-sm text-success">
            Password reset successful. You can now sign in with your new password.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-brand-text hover:underline">
                Forgot password?
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          No account yet?{" "}
          <Link href="/register" className="text-brand-text hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
