import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { getEducationAccessImpact } from "@/lib/education-access/impact";

export const metadata: Metadata = {
  title: "Our Impact | SmartPrepAfrica Education Access",
  description:
    "Real, non-fabricated impact figures from the SmartPrepAfrica Education Access Initiative's sponsor-funded students.",
};

// What We Measure (brief §10) — some rows already have a live figure from
// getEducationAccessImpact(); the rest are named here as the metrics
// SmartPrepAfrica intends to report on as the program grows, not numbers
// available today.
const whatWeMeasure = [
  "Students enrolled",
  "Students activated",
  "Learning sessions completed",
  "Questions attempted",
  "Practice exams completed",
  "Lesson completion",
  "AI learning sessions",
  "Student engagement",
  "School participation",
  "Geographic reach",
] as const;

export default async function EducationAccessImpactPage() {
  const impact = await getEducationAccessImpact();

  const metrics = [
    { label: "Students Sponsored", value: impact.studentsSponsored },
    { label: "Active Students", value: impact.studentsSponsored },
    { label: "Schools Supported", value: impact.schoolsReached },
    { label: "States Reached", value: impact.statesReached },
    { label: "Lessons Completed", value: impact.lessonsCompleted },
    { label: "Exam Practice Sessions", value: impact.examAttempts },
    { label: "Certificates Earned", value: impact.certificates },
  ];
  const hasRealData = metrics.some((m) => m.value > 0);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h1 className="text-h1 font-semibold text-text-primary">Our Impact</h1>
          <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
            {hasRealData
              ? "Real, platform-wide figures from students who have redeemed a sponsor-funded seat on SmartPrepAfrica — no fabricated numbers."
              : "Our first Education Access partnerships are being developed. Impact reporting will be published as programs launch."}
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-border bg-surface-raised p-5 text-center">
                <p className="text-xs uppercase tracking-wide text-text-muted">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {metric.value.toLocaleString("en-US")}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="text-h2 font-semibold text-text-primary">What We Measure</h2>
          <p className="mt-3 text-text-secondary">
            SmartPrepAfrica intends to provide partners with transparent, program-level reporting
            as sponsored programs grow. Metrics we track or intend to track include:
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
            {whatWeMeasure.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-text-muted">
            We do not claim improvements in examination scores unless supported by validated data.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-12 text-center">
          <p className="text-sm text-text-secondary">
            Want to see the full partnership overview?{" "}
            <Link href="/education-access/partners" className="text-brand-text hover:underline">
              Read it here
            </Link>
            , or{" "}
            <Link href="/education-access/sponsor" className="text-brand-text hover:underline">
              start a sponsorship
            </Link>
            .
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
