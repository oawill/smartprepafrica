import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { getEducationAccessImpact } from "@/lib/education-access/impact";

export const metadata: Metadata = {
  title: "Concept Note | SmartPrepAfrica Education Access Initiative",
  description:
    "A one-page concept note for the SmartPrepAfrica Education Access Initiative, prepared for foundations and institutional partners.",
};

const whatFundingSupports = [
  "Student platform access",
  "Exam-preparation resources",
  "AI Study Coach access",
  "Digital lessons",
  "School onboarding",
  "Student activation",
  "Program administration",
  "Technical infrastructure",
  "Reporting and analytics",
  "Student support",
] as const;

const measurement = [
  "Students enrolled",
  "Students activated",
  "Active students",
  "Lessons completed",
  "Practice questions attempted",
  "Mock exams completed",
  "AI Study Coach usage",
  "School participation",
  "Geographic coverage",
] as const;

export default async function ConceptNotePage() {
  const impact = await getEducationAccessImpact();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <span className="text-xs font-medium uppercase tracking-wide text-brand-text">Concept Note</span>
          <h1 className="mt-2 text-h1 font-semibold text-text-primary">
            SmartPrepAfrica Education Access Initiative
          </h1>

          <div className="mt-10 space-y-10">
            <div>
              <h2 className="text-h2 font-semibold text-text-primary">The Challenge</h2>
              <p className="mt-3 text-text-secondary">
                Students across Africa often face significant differences in access to quality
                teachers, exam-preparation resources, learning materials, digital tools, and
                personalized academic support.
              </p>
            </div>

            <div>
              <h2 className="text-h2 font-semibold text-text-primary">The Opportunity</h2>
              <p className="mt-3 text-text-secondary">
                Technology provides an opportunity to extend high-quality learning resources
                beyond traditional classroom boundaries. SmartPrepAfrica combines digital lessons,
                examination preparation, structured practice, study resources, school
                participation, and AI-supported learning within one platform.
              </p>
            </div>

            <div>
              <h2 className="text-h2 font-semibold text-text-primary">The Initiative</h2>
              <p className="mt-3 text-text-secondary">
                The SmartPrepAfrica Education Access Initiative allows partners to sponsor access
                for students and schools that may otherwise face financial or educational-resource
                barriers.
              </p>
            </div>

            <div className="rounded-2xl border border-brand/30 bg-brand/5 p-6">
              <span className="text-xs font-medium uppercase tracking-wide text-brand-text">
                Flagship Program
              </span>
              <h2 className="mt-2 text-h2 font-semibold text-text-primary">
                AI Tutor for 10,000 Nigerian Students
              </h2>
              <p className="mt-3 text-text-secondary">
                Our goal is to expand sponsored access to up to 10,000 students through this
                flagship initiative — a program goal we are working toward, not a completed
                result.{" "}
                <Link href="/education-access/10000-students" className="text-brand-text hover:underline">
                  Read the full program overview
                </Link>
                .
              </p>
            </div>

            <div>
              <h2 className="text-h2 font-semibold text-text-primary">What Funding Supports</h2>
              <ul className="mt-4 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
                {whatFundingSupports.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-h2 font-semibold text-text-primary">Measurement</h2>
              <p className="mt-3 text-text-secondary">
                Program reporting may include:
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
                {measurement.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-text-muted">
                Real, current figures are published at{" "}
                <Link href="/education-access/impact" className="text-brand-text hover:underline">
                  our Impact page
                </Link>{" "}
                — {impact.studentsSponsored.toLocaleString("en-US")} sponsored students to date,
                with no estimates or projections included.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center">
              <h2 className="text-h2 font-semibold text-text-primary">Partnership Request</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">
                We welcome conversations with foundations, corporations, NGOs, diaspora
                organizations, and education partners interested in expanding access to digital
                learning across Africa.
              </p>
              <Link
                href="/education-access/funding#contact"
                className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Discuss a Partnership
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
