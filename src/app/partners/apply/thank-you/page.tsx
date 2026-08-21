import Link from "next/link";

export default function PartnerApplyThankYouPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <h1 className="text-xl font-semibold">Application received 🎉</h1>
        <p className="mt-3 text-sm text-slate-400">
          Thanks for applying to become a SmartPrepAfrica.com Partner. We&apos;ll review your application and
          notify you once it&apos;s approved — you can log in anytime to check your status.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-orange-500 px-6 py-2.5 text-sm font-medium text-slate-950 hover:bg-orange-400"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
