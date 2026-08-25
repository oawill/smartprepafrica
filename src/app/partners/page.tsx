import Link from "next/link";

const steps = [
  {
    title: "Join",
    body: "Apply as a SmartPrepAfrica.com Partner in a few minutes — no upfront cost.",
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
    body: "Get paid for the students and schools that stick with SmartPrepAfrica.com.",
  },
];

export default function PartnersLandingPage() {
  return (
    <>
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <span className="rounded-full border border-border-strong px-3 py-1 text-xs text-text-secondary">
            SmartPrepAfrica.com Partner Program
          </span>
          <h1 className="mx-auto mt-6 max-w-2xl text-display font-semibold leading-tight text-text-primary">
            Become a SmartPrepAfrica.com Partner
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-text-secondary">
            Earn while helping students learn. Refer students and schools to SmartPrepAfrica.com
            and get rewarded for the ones who stick around — teachers, consultants, influencers,
            agencies, and anyone with a network worth sharing with.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/partners/apply"
              className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Become a Partner
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-center text-h2 font-semibold text-text-primary">How it works</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div key={step.title} className="rounded-xl border border-border bg-surface-raised p-5">
                <span className="text-xs font-medium text-brand-text">Step {i + 1}</span>
                <p className="mt-1 font-semibold text-text-primary">{step.title}</p>
                <p className="mt-2 text-sm text-text-secondary">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <p className="text-xs text-text-muted">
            Commission structure and payout terms are set by SmartPrepAfrica.com and may change; exact rates
            are confirmed once your application is approved. We don&apos;t promise a specific
            income amount.
          </p>
        </section>
      </main>
    </>
  );
}
