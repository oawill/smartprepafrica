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
      <p className="mt-8 text-sm font-medium text-amber-400">403</p>
      <h1 className="mt-2 text-2xl font-semibold">Access denied</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        You don&apos;t have permission to view this page. If you think this is a mistake, contact
        support or head back to your dashboard.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-medium text-slate-950 hover:bg-orange-400"
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
