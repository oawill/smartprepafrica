import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";

export const metadata: Metadata = {
  title: "AI Tutor for 10,000 Nigerian Students | SmartPrepAfrica",
  description:
    "SmartPrepAfrica's flagship Education Access program: providing up to 10,000 Nigerian students with structured digital learning and AI-supported study resources.",
  openGraph: {
    title: "AI Tutor for 10,000 Nigerian Students | SmartPrepAfrica",
    description:
      "SmartPrepAfrica's flagship Education Access program: providing up to 10,000 Nigerian students with structured digital learning and AI-supported study resources.",
  },
};

const programComponents = [
  "Exam preparation",
  "Digital lessons",
  "Study guides",
  "Practice questions",
  "AI Study Coach",
  "Learning analytics",
] as const;

const partnerOpportunities = [
  { name: "Sponsor 100 Students", interest: "AI_TUTOR_10K" },
  { name: "Sponsor 500 Students", interest: "AI_TUTOR_10K" },
  { name: "Sponsor 1,000 Students", interest: "AI_TUTOR_10K" },
  { name: "Sponsor a School", interest: "SPONSOR_SCHOOL" },
  { name: "Sponsor a State or Community Cohort", interest: "SPONSOR_COMMUNITY" },
  { name: "Custom Partnership", interest: "FOUNDATION_PARTNERSHIP" },
] as const;

export default function TenThousandStudentsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <span className="text-xs font-medium uppercase tracking-wide text-brand-text">Flagship Program</span>
          <h1 className="mx-auto mt-2 text-h1 font-semibold text-text-primary">
            AI Tutor for 10,000 Nigerian Students
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
            This is a program goal we are working toward, not a milestone already reached.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">Goal</h2>
          <p className="mt-3 text-text-secondary">
            Provide up to 10,000 students with structured digital learning and AI-supported study
            resources.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">Students</h2>
          <p className="mt-3 text-text-secondary">
            Target students who may face barriers to accessing quality educational and
            exam-preparation resources.
          </p>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">Program Components</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {programComponents.map((item) => (
              <div key={item} className="rounded-xl border border-border bg-surface-raised p-4 text-sm text-text-secondary">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">Partner Opportunities</h2>
          <p className="mt-2 text-sm text-text-secondary">No pricing is assigned yet — every opportunity is scoped with your organization directly.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {partnerOpportunities.map((opp) => (
              <Link
                key={opp.name}
                href={`/education-access/sponsor?interest=${opp.interest}`}
                className="rounded-xl border border-border bg-surface-raised p-4 text-sm font-medium text-text-primary hover:border-brand"
              >
                {opp.name}
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-12 text-center">
          <Link
            href="/education-access/sponsor?interest=AI_TUTOR_10K"
            className="inline-block rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Support the 10,000 Students Initiative
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
