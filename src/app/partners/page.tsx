import Link from "next/link";

const steps = [
  {
    title: "Join",
    body: "Apply as an Educom Partner in a few minutes — no upfront cost.",
  },
  {
    title: "Share",
    body: "Get your unique referral link and share it with students, parents, and schools.",
  },
  {
    title: "Track",
    body: "Watch clicks turn into registrations and paid students in your partner dashboard.",
  },
  {
    title: "Earn",
    body: "Get paid for the students and schools that stick with Educom.",
  },
];

export default function PartnersLandingPage() {
  return (
    <>
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
            Educom Partner Program
          </span>
          <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            Become an Educom Partner
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Earn while helping students learn. Refer students and schools to Educom and get
            rewarded for the ones who stick around — teachers, consultants, influencers, agencies,
            and anyone with a network worth sharing with.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/partners/apply"
              className="rounded-full bg-orange-500 px-6 py-3 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Become a Partner
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-center text-2xl font-semibold">How it works</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div key={step.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <span className="text-xs font-medium text-orange-400">Step {i + 1}</span>
                <p className="mt-1 font-semibold">{step.title}</p>
                <p className="mt-2 text-sm text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <p className="text-xs text-slate-500">
            Commission structure and payout terms are set by Educom and may change; exact rates
            are confirmed once your application is approved. We don&apos;t promise a specific
            income amount.
          </p>
        </section>
      </main>
    </>
  );
}
