"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <Logo size="lg" />
      <p className="mt-8 text-sm font-medium text-danger">500</p>
      <h1 className="mt-2 text-h2 font-semibold text-text-primary">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        We hit an unexpected error on our end. Please try again — if it keeps happening, let us
        know.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-border-strong px-6 py-2.5 text-sm text-text-primary hover:border-text-muted"
        >
          Go home
        </Link>
        <Link
          href="/contact"
          className="rounded-full border border-border-strong px-6 py-2.5 text-sm text-text-primary hover:border-text-muted"
        >
          Contact support
        </Link>
      </div>
    </main>
  );
}
