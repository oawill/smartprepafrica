import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Page Not Found | Educom",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <Logo size="lg" />
      <p className="mt-8 text-sm font-medium text-orange-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-medium text-slate-950 hover:bg-orange-400"
        >
          Go home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-slate-700 px-6 py-2.5 text-sm text-slate-200 hover:border-slate-500"
        >
          Go to dashboard
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
