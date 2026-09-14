import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { getEducationAccessImpact } from "@/lib/education-access/impact";
import { OrganizationalInfo } from "@/components/education-access/organizational-info";

export const metadata: Metadata = {
  title: "Funding Proposal | SmartPrepAfrica Education Access Initiative",
  description:
    "A full funding proposal for the SmartPrepAfrica Education Access Initiative, prepared for foundations, corporations, and institutional partners.",
};

const targetBeneficiaries = [
  "Secondary-school students",
  "Students preparing for WAEC",
  "Students preparing for NECO",
  "Students preparing for JAMB/UTME",
  "Students in underserved communities",
  "Students attending resource-constrained schools",
  "Students with limited access to supplementary learning support",
] as const;

const programActivities = [
  "Student onboarding",
  "Digital-learning access",
  "Subject-based learning resources",
  "Exam-preparation materials",
  "Practice drills",
  "Mock examinations",
  "Study guides",
  "AI Study Coach access",
  "Progress and participation tracking",
  "School engagement",
  "Partner reporting",
] as const;

const theoryOfChange = [
  {
    title: "Inputs",
    items: ["Partner funding", "SmartPrepAfrica technology", "Educational content", "Participating schools", "Teachers", "Program administration"],
  },
  {
    title: "Activities",
    items: ["Student enrollment", "Digital lessons", "Exam practice", "AI-supported learning", "Study guidance", "School participation"],
  },
  {
    title: "Outputs",
    items: ["Students activated", "Learning sessions", "Questions attempted", "Lessons completed", "Schools participating", "AI learning sessions"],
  },
  {
    title: "Short-Term Outcomes",
    items: [
      "Greater access to learning resources",
      "Increased practice opportunities",
      "Greater engagement with structured exam preparation",
      "Increased exposure to digital-learning tools",
    ],
  },
] as const;

const meMetrics = [
  "Student activation",
  "Student activity",
  "Learning frequency",
  "Questions attempted",
  "Lesson completion",
  "Practice exam completion",
  "AI Study Coach usage",
  "School participation",
  "Geographic reach",
  "Program retention",
] as const;

const reportingDimensions = ["Sponsor", "Program", "School", "State", "Community", "Cohort", "Date range"] as const;

const outputExamples = [
  "Number of students enrolled",
  "Number of schools participating",
  "Number of learning sessions",
  "Number of exam questions attempted",
] as const;

const outcomeExamples = [
  "Increased student engagement",
  "Improved practice consistency",
  "Increased use of structured study resources",
] as const;

const budgetCategories = [
  { title: "Program Access", items: ["Student platform access", "Premium learning access", "AI Study Coach usage"] },
  { title: "Content", items: ["Educational content development", "Question-bank development", "Lesson production", "Study-guide development"] },
  { title: "School Engagement", items: ["School onboarding", "Teacher engagement", "Training", "Program coordination"] },
  { title: "Technology", items: ["Hosting", "Database", "AI usage", "Software services", "Security", "Analytics"] },
  { title: "Monitoring & Evaluation", items: ["Reporting", "Data analysis", "Impact measurement"] },
  { title: "Program Administration", items: ["Program management", "Partner management", "Student support"] },
] as const;

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border py-10 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-semibold text-brand-text">{number}.</span>
        <h2 className="text-h2 font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="mt-4 space-y-3 text-text-secondary">{children}</div>
    </section>
  );
}

export default async function EducationAccessProposalPage() {
  const impact = await getEducationAccessImpact();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <span className="text-xs font-medium uppercase tracking-wide text-brand-text">Funding Proposal</span>
          <h1 className="mt-2 text-h1 font-semibold text-text-primary">
            SmartPrepAfrica Education Access Initiative
          </h1>
        </section>

        <div className="mx-auto max-w-3xl px-6 pb-16">
          <Section number={1} title="Executive Summary">
            <p>
              SmartPrepAfrica is an African education technology platform focused on helping
              students access digital learning, structured exam preparation, and AI-supported
              study resources.
            </p>
            <p>
              The SmartPrepAfrica Education Access Initiative enables institutional and
              philanthropic partners to support students, schools, and communities that may face
              barriers to accessing quality educational resources.
            </p>
            <p>
              Its flagship program, AI Tutor for 10,000 Nigerian Students, is designed to expand
              access to structured digital learning and AI-supported education for students in
              Nigeria.
            </p>
            <p>
              Partners can fund student cohorts, schools, communities, or larger geographic
              programs while receiving program-level impact reporting.
            </p>
          </Section>

          <Section number={2} title="Background">
            <p>
              SmartPrepAfrica is operated by Cicerah Technologies Limited and provides digital
              learning, exam preparation, live and recorded lessons, practice questions, study
              tools, and AI-supported learning to students preparing for WAEC, NECO, UTME, and
              Post-UTME. The Education Access Initiative extends this existing, operating platform
              to students and schools that would otherwise be excluded because of affordability,
              limited resources, or geographic location.
            </p>
          </Section>

          <Section number={3} title="Education Challenge">
            <p>
              Students across Africa often face significant differences in access to quality
              teachers, exam-preparation resources, learning materials, digital tools, and
              personalized academic support.
            </p>
          </Section>

          <Section number={4} title="SmartPrepAfrica Solution">
            <p>
              SmartPrepAfrica already provides digital learning, exam preparation, practice
              questions, study tools, and AI-supported learning at scale. The Education Access
              Initiative extends this existing platform&apos;s capabilities to sponsored students
              and schools, rather than building a separate program from scratch.
            </p>
          </Section>

          <Section number={5} title="Education Access Initiative">
            <p>
              Through sponsorships and institutional partnerships, organizations can fund
              SmartPrepAfrica access for individual students, classrooms, schools, or entire
              communities — see{" "}
              <Link href="/education-access#choose-your-impact" className="text-brand-text hover:underline">
                current sponsorship levels
              </Link>
              .
            </p>
          </Section>

          <Section number={6} title="Flagship Program">
            <p>
              <strong className="text-text-primary">AI Tutor for 10,000 Nigerian Students</strong> —
              our goal is to expand sponsored access to up to 10,000 students through this
              flagship initiative. This is a program goal we are working toward, not a completed
              result.{" "}
              <Link href="/education-access/10000-students" className="text-brand-text hover:underline">
                Read the full program overview
              </Link>
              .
            </p>
          </Section>

          <Section number={7} title="Target Beneficiaries">
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {targetBeneficiaries.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </Section>

          <Section number={8} title="Program Activities">
            <p className="font-semibold text-text-primary">What the Program Delivers</p>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {programActivities.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </Section>

          <Section number={9} title="Implementation Model">
            <p>
              Sponsorship interest is submitted through the Education Access Initiative, reviewed
              and confirmed with the partner, and fulfilled through SmartPrepAfrica&apos;s existing
              sponsorship system — the same mechanism already used to issue and track sponsored
              student access on the platform. Confirmed programs are linked to real sponsored
              seats, so program-level activity can be reported back to the partner.
            </p>
          </Section>

          <Section number={10} title="Expected Outputs">
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {outputExamples.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </Section>

          <Section number={11} title="Expected Outcomes">
            <p>Outcomes are only reported when measurable data exists to support them, for example:</p>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {outcomeExamples.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
            <p className="text-sm text-text-muted">
              We do not automatically state examination-score improvement without evidence.
            </p>
          </Section>

          <Section number={12} title="Measurement & Evaluation">
            <p className="font-semibold text-text-primary">Theory of Change</p>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              {theoryOfChange.map((stage) => (
                <div key={stage.title} className="rounded-xl border border-border bg-surface-raised p-4">
                  <p className="font-semibold text-text-primary">{stage.title}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {stage.items.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 font-semibold text-text-primary">Long-Term Goal</p>
            <p>Expand equitable access to quality educational resources for African students.</p>
            <p className="text-sm text-text-muted">
              We do not claim guaranteed improvements in examination performance.
            </p>

            <p className="mt-4 font-semibold text-text-primary">Monitoring, Evaluation &amp; Learning</p>
            <p>We track, or intend to track, the following as programs grow:</p>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {meMetrics.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
            <p className="mt-2">Reporting can be structured by:</p>
            <ul className="flex flex-wrap gap-2 text-sm">
              {reportingDimensions.map((item) => (
                <li key={item} className="rounded-full border border-border-strong px-3 py-1">
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          <Section number={13} title="Data & Reporting">
            <p>
              Sponsored accounts and program activity are tracked internally, and program-level
              reporting is provided to partners on request. Real, current impact figures are
              published publicly at{" "}
              <Link href="/education-access/impact" className="text-brand-text hover:underline">
                our Impact page
              </Link>{" "}
              — reflecting exactly {impact.studentsSponsored.toLocaleString("en-US")} sponsored
              students to date, with no estimates or projections included.
            </p>
          </Section>

          <Section number={14} title="Sustainability">
            <p>
              The Education Access Initiative is designed to grow through renewed and expanded
              partnerships across multiple funders, rather than dependence on a single source.
              SmartPrepAfrica&apos;s core platform is commercially operated, which keeps the
              underlying technology and content maintained independent of any one program&apos;s
              funding cycle.
            </p>
          </Section>

          <Section number={15} title="Partnership Opportunities">
            <p>
              From sponsoring an individual student to a full institutional partnership — see{" "}
              <Link href="/education-access#choose-your-impact" className="text-brand-text hover:underline">
                current sponsorship levels
              </Link>{" "}
              or{" "}
              <Link href="/education-access/funding#contact" className="text-brand-text hover:underline">
                discuss a custom partnership
              </Link>
              .
            </p>
          </Section>

          <Section number={16} title="Budget Framework">
            <p>
              Funding may be allocated across the following categories. Amounts are defined per
              partnership rather than fixed in advance — no financial figures are presented here.
            </p>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              {budgetCategories.map((cat) => (
                <div key={cat.title} className="rounded-xl border border-border bg-surface-raised p-4">
                  <p className="font-semibold text-text-primary">{cat.title}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {cat.items.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          <Section number={17} title="Organizational Information">
            <OrganizationalInfo />
          </Section>

          <Section number={18} title="Contact Information">
            <p>
              We welcome conversations with foundations, corporations, NGOs, diaspora
              organizations, and education partners interested in expanding access to digital
              learning across Africa.
            </p>
            <Link
              href="/education-access/funding#contact"
              className="mt-2 inline-block rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Discuss a Partnership
            </Link>
          </Section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
