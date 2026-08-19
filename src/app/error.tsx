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
      <p className="mt-8 text-sm font-medium text-red-400">500</p>
      <h1 className="mt-2 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        We hit an unexpected error on our end. Please try again — if it keeps happening, let us
        know.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-medium text-slate-950 hover:bg-orange-400"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-slate-700 px-6 py-2.5 text-sm text-slate-200 hover:border-slate-500"
        >
          Go home
        </Link>
        <Link
          href="/contact"
          className="rounded-full border border-slate-700 px-6 py-2.5 text-sm text-slate-200 hover:border-slate-500"
        >
          Contact support
        </Link>
      </div>
    </main>
  );
}
