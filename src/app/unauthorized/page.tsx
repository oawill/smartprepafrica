import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Access Denied",
};

export default function UnauthorizedPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <Logo size="lg" />
      <p className="mt-8 text-sm font-medium text-warning">403</p>
      <h1 className="mt-2 text-h2 font-semibold text-text-primary">Access denied</h1>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        You don&apos;t have permission to view this page. If you think this is a mistake, contact
        support or head back to your dashboard.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
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
