import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <Logo size="lg" />
      <p className="mt-8 text-sm font-medium text-brand-text">404</p>
      <h1 className="mt-2 text-h2 font-semibold text-text-primary">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Go home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-border-strong px-6 py-2.5 text-sm text-text-primary hover:border-text-muted"
        >
          Go to dashboard
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
