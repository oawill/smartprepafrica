import Link from "next/link";

export default function PartnerApplyThankYouPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-8 text-center">
        <h1 className="text-h2 font-semibold text-text-primary">Application received 🎉</h1>
        <p className="mt-3 text-sm text-text-secondary">
          Thanks for applying to become a SmartPrepAfrica.com Partner. We&apos;ll review your application and
          notify you once it&apos;s approved — you can log in anytime to check your status.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
