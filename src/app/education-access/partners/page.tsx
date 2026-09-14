import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { getEducationAccessImpact } from "@/lib/education-access/impact";
import { getPlatformSettings } from "@/lib/legal/settings";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Education Access Partnerships | SmartPrepAfrica",
  description:
    "Partner with SmartPrepAfrica to expand access to digital learning, exam preparation, and AI-supported education for African students.",
  openGraph: {
    title: "Education Access Partnerships | SmartPrepAfrica",
    description:
      "Partner with SmartPrepAfrica to expand access to digital learning, exam preparation, and AI-supported education for African students.",
  },
};

const whoWeServe = [
  "Students preparing for WAEC, NECO, UTME, and Post-UTME.",
  "Schools seeking digital learning and exam-preparation resources for their students.",
  "Underserved communities facing financial, geographic, or educational-access barriers.",
  "Girls and young women pursuing STEM subjects.",
] as const;

const howPartnershipsWork = [
  { step: "1", title: "Initial Conversation", body: "We discuss your organization's goals and how they align with the Education Access Initiative." },
  { step: "2", title: "Program Design", body: "We scope the number of students, schools, or communities to support, and the program period." },
  { step: "3", title: "Access Activation", body: "Eligible students receive access to the appropriate SmartPrepAfrica learning resources." },
  { step: "4", title: "Ongoing Reporting", body: "We provide program-level updates on participation and engagement." },
] as const;

const whatWeMeasure = [
  "Students enrolled and activated",
  "Learning sessions and lesson completion",
  "Questions attempted and practice exams completed",
  "AI Study Coach usage",
  "School participation",
  "Geographic reach",
] as const;

export default async function EducationAccessPartnersPage() {
  const [impact, settings, partners] = await Promise.all([
    getEducationAccessImpact(),
    getPlatformSettings(),
    prisma.educationAccessPartner.findMany({
      where: { publicVisibility: true },
      orderBy: { organizationName: "asc" },
    }),
  ]);
  const legalName = settings.companyLegalName || "Cicerah Technologies Limited";

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h1 className="text-h1 font-semibold text-text-primary">Education Access Partnerships</h1>
          <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
            A partnership overview for foundations, corporations, NGOs, and institutional funders
            considering the SmartPrepAfrica Education Access Initiative.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">About SmartPrepAfrica</h2>
          <p className="mt-3 text-text-secondary">
            SmartPrepAfrica is operated by {legalName}. It is a learning ecosystem for Nigerian
            students, schools, and educators, providing exam preparation for WAEC, NECO, UTME, and
            Post-UTME with an AI-assisted study coach, practice questions, and mock exams, and
            connecting students to live and recorded classes from independent schools, teachers,
            and organizations.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">The Education Challenge</h2>
          <p className="mt-3 text-text-secondary">
            Many students across Nigeria face barriers to quality exam preparation and digital
            learning resources — including affordability, limited access to structured study
            materials, and uneven access to qualified teaching support.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">Our Solution</h2>
          <p className="mt-3 text-text-secondary">
            SmartPrepAfrica already provides digital learning, exam preparation, practice
            questions, study tools, and AI-supported learning at scale. The Education Access
            Initiative extends this existing platform to students and schools that would
            otherwise be excluded.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">Education Access Initiative</h2>
          <p className="mt-3 text-text-secondary">
            Through sponsorships and institutional partnerships, organizations can fund
            SmartPrepAfrica access for individual students, classrooms, schools, or entire
            communities — see{" "}
            <Link href="/education-access#choose-your-impact" className="text-brand-text hover:underline">
              current sponsorship levels
            </Link>
            .
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">AI Tutor for 10,000 Nigerian Students</h2>
          <p className="mt-3 text-text-secondary">
            Our flagship program: a goal to provide up to 10,000 students with structured digital
            learning and AI-supported study resources.{" "}
            <Link href="/education-access/10000-students" className="text-brand-text hover:underline">
              Read the full program overview
            </Link>
            .
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">Who We Serve</h2>
          <ul className="mt-4 space-y-2 text-sm text-text-secondary">
            {whoWeServe.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-8">
          <h2 className="text-center text-h2 font-semibold text-text-primary">How Partnerships Work</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {howPartnershipsWork.map((s) => (
              <div key={s.step} className="rounded-xl border border-border bg-surface-raised p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
                  {s.step}
                </span>
                <p className="mt-3 font-semibold text-text-primary">{s.title}</p>
                <p className="mt-1 text-sm text-text-secondary">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">Measurable Outcomes</h2>
          <p className="mt-3 text-text-secondary">
            SmartPrepAfrica intends to provide participating partners with transparent
            program-level reporting on sponsored access and student engagement. We track — or
            intend to track — the following as programs grow:
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

        <section className="mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">Reporting &amp; Accountability</h2>
          <p className="mt-3 text-text-secondary">
            Sponsored accounts and usage are tracked internally, and program participation is
            reportable to partners at the program level. We apply the same data-privacy
            protections used across SmartPrepAfrica to any sponsor-related data.
          </p>
          <p className="mt-3 text-text-secondary">
            {legalName} is a private company, not a registered nonprofit — partnerships through
            the Education Access Initiative are programmatic partnerships and program funding, not
            tax-deductible charitable donations. We do not claim independent audits.
          </p>
          <p className="mt-3 text-sm text-text-muted">
            Current, real impact figures are published at{" "}
            <Link href="/education-access/impact" className="text-brand-text hover:underline">
              our Impact page
            </Link>
            — reflecting exactly {impact.studentsSponsored.toLocaleString("en-US")} sponsored
            students to date, with no estimates or projections included.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-h2 font-semibold text-text-primary">Partnership Opportunities</h2>
          <p className="mt-3 text-text-secondary">
            From sponsoring an individual student to a full institutional partnership — see{" "}
            <Link href="/education-access#choose-your-impact" className="text-brand-text hover:underline">
              current sponsorship levels
            </Link>{" "}
            or{" "}
            <Link href="/education-access/sponsor?interest=FOUNDATION_PARTNERSHIP" className="text-brand-text hover:underline">
              discuss a custom partnership
            </Link>
            .
          </p>
        </section>

        {partners.length > 0 && (
          <section className="mx-auto max-w-5xl px-6 py-8">
            <h2 className="text-center text-h2 font-semibold text-text-primary">Our Partners</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((partner) => (
                <div key={partner.id} className="rounded-xl border border-border bg-surface-raised p-5 text-center">
                  <p className="font-semibold text-text-primary">{partner.organizationName}</p>
                  {partner.description && (
                    <p className="mt-2 text-sm text-text-secondary">{partner.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-3xl px-6 py-12 text-center">
          <h2 className="text-h2 font-semibold text-text-primary">Contact SmartPrepAfrica</h2>
          <Link
            href="/education-access/sponsor?interest=FOUNDATION_PARTNERSHIP"
            className="mt-4 inline-block rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Request Partnership Information
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
