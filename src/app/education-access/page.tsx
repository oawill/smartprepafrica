import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { EducationAccessInquiryForm } from "@/components/education-access/inquiry-form";
import { SPONSOR_PACKAGES } from "@/lib/education-access/packages";
import { getEducationAccessImpact } from "@/lib/education-access/impact";
import { getPlatformSettings } from "@/lib/legal/settings";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Education Access Initiative | SmartPrepAfrica",
  description:
    "Support the SmartPrepAfrica Education Access Initiative and help expand access to exam preparation, digital lessons, and AI-powered learning for students across Africa.",
  openGraph: {
    title: "Education Access Initiative | SmartPrepAfrica",
    description:
      "Support the SmartPrepAfrica Education Access Initiative and help expand access to exam preparation, digital lessons, and AI-powered learning for students across Africa.",
  },
};

const sponsorCards = [
  {
    title: "Sponsor a Student",
    body: "Fund SmartPrepAfrica access for an individual student.",
    items: [
      "Exam preparation",
      "AI Study Coach access",
      "Practice questions and drills",
      "Study guides",
      "Digital lessons",
      "Learning resources",
    ],
    interest: "SPONSOR_STUDENT",
    cta: "Sponsor a Student",
  },
  {
    title: "Sponsor a School",
    body: "For companies, foundations, NGOs, alumni groups, and diaspora organizations sponsoring access for a school.",
    items: [
      "Student access",
      "Teacher-supported learning",
      "Exam preparation",
      "School-level reporting",
      "Digital learning resources",
      "AI-supported learning",
    ],
    interest: "SPONSOR_SCHOOL",
    cta: "Sponsor a School",
  },
  {
    title: "Sponsor a Community",
    body: "Support students across a community, LGA, state, or targeted region.",
    items: [],
    interest: "SPONSOR_COMMUNITY",
    cta: "Support a Community",
  },
] as const;

const focusAreas = [
  {
    title: "Exam Preparation",
    body: "Support for WAEC, NECO, JAMB/UTME, and other exams already offered on SmartPrepAfrica.",
  },
  {
    title: "Digital Learning",
    body: "Access to structured lessons, study materials, recorded classes, and learning resources.",
  },
  {
    title: "AI-Powered Learning",
    body: "Access to SmartPrepAfrica's AI Study Coach and related AI-supported learning tools.",
  },
  {
    title: "School Partnerships",
    body: "Working with schools to expand access to quality teaching and digital learning.",
  },
  {
    title: "Underserved Communities",
    body: "Opportunities for students facing financial, geographic, or educational-access barriers.",
  },
  {
    title: "Girls in STEM",
    body: "A targeted sponsorship track for expanding girls' access to STEM learning resources.",
  },
] as const;

const howItWorks = [
  { step: "1", title: "Select a Program", body: "Choose whether to support students, schools, communities, or a targeted education initiative." },
  { step: "2", title: "Choose Your Impact Level", body: "Select the number of students or schools you want to support." },
  { step: "3", title: "SmartPrepAfrica Activates Access", body: "Eligible students receive access to the appropriate SmartPrepAfrica learning resources." },
  { step: "4", title: "Track the Impact", body: "Sponsors receive appropriate impact reporting based on the sponsored program." },
] as const;

const partnershipCategories = [
  {
    title: "Corporate CSR",
    body: "Support student cohorts, schools, or communities through corporate education initiatives.",
  },
  {
    title: "Foundations",
    body: "Support measurable education-access programs aligned with learning, digital inclusion, examination readiness, and youth development.",
  },
  {
    title: "NGOs and Development Organizations",
    body: "Integrate SmartPrepAfrica into education, youth-development, and digital-learning programs.",
  },
  {
    title: "Diaspora and Alumni Organizations",
    body: "Support schools, communities, and students in Nigeria and across Africa.",
  },
] as const;

const establishedFacts = [
  "Exam preparation for WAEC, NECO, UTME, and Post-UTME with an AI-assisted study coach, practice questions, and mock exams.",
  "Live and recorded classes from independent schools, teachers, and organizations across academics, career development, technology, and life skills.",
  "An existing sponsorship system already used to fund student access — the same system that powers the packages on this page.",
] as const;

export default async function EducationAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ interest?: string; package?: string }>;
}) {
  const { interest, package: packageId } = await searchParams;
  const [impact, settings, schools] = await Promise.all([
    getEducationAccessImpact(),
    getPlatformSettings(),
    prisma.school.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const legalName = settings.companyLegalName || "Cicerah Technologies Limited";

  const impactMetrics = [
    { label: "Students Sponsored", value: impact.studentsSponsored },
    { label: "Schools with Active Sponsorship Programs", value: impact.schoolsReached },
    { label: "States Reached", value: impact.statesReached },
    { label: "Lessons Completed by Sponsored Students", value: impact.lessonsCompleted },
    { label: "Exam Attempts by Sponsored Students", value: impact.examAttempts },
    { label: "Certificates Earned by Sponsored Students", value: impact.certificates },
  ];
  const hasRealImpactData = impactMetrics.some((m) => m.value > 0);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-display font-semibold leading-tight text-text-primary">
            Education Shouldn&apos;t Depend on What a Family Can Afford
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
            The SmartPrepAfrica Education Access Initiative works with schools, foundations,
            corporations, NGOs, diaspora organizations, and individuals to give African students
            access to quality lessons, exam preparation, AI-powered learning tools, and digital
            learning opportunities regardless of their economic circumstances.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="#sponsor-form"
              className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Sponsor Students
            </Link>
            <Link
              href="#partner"
              className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
            >
              Partner With Us
            </Link>
          </div>
          <Link href="#impact" className="mt-4 inline-block text-sm text-brand-text hover:underline">
            See Our Impact →
          </Link>
        </section>

        {/* About */}
        <section className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="text-h2 font-semibold text-text-primary">Expanding Access to Quality Education</h2>
          <p className="mt-3 text-text-secondary">
            SmartPrepAfrica already provides digital learning, exam preparation, live and recorded
            lessons, practice questions, study tools, and AI-supported learning. The Education
            Access Initiative extends these capabilities to students and schools that may
            otherwise be excluded because of affordability, limited educational resources, or
            geographic location.
          </p>
        </section>

        {/* Foundation credibility */}
        <section className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="text-h2 font-semibold text-text-primary">An Established Platform, Not a Pilot</h2>
          <p className="mt-3 text-text-secondary">
            SmartPrepAfrica is operated by {legalName}. The Education Access Initiative runs on
            top of a platform already in real use, including:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-text-secondary">
            {establishedFacts.map((fact) => (
              <li key={fact}>· {fact}</li>
            ))}
          </ul>
        </section>

        {/* How Sponsors Can Help */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-center text-h2 font-semibold text-text-primary">How Sponsors Can Help</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {sponsorCards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-border bg-surface-raised p-6">
                <p className="font-semibold text-text-primary">{card.title}</p>
                <p className="mt-2 text-sm text-text-secondary">{card.body}</p>
                {card.items.length > 0 && (
                  <ul className="mt-4 space-y-1 text-sm text-text-secondary">
                    {card.items.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                )}
                <Link
                  href={`/education-access?interest=${card.interest}#sponsor-form`}
                  className="mt-5 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                >
                  {card.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Choose Your Impact */}
        <section id="choose-your-impact" className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-center text-h2 font-semibold text-text-primary">Choose Your Impact</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-text-secondary">
            Every sponsorship level can be adjusted to fit your organization&apos;s goals — pricing
            is confirmed directly with your organization, not fixed on this page.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SPONSOR_PACKAGES.map((pkg) => (
              <div key={pkg.id} className="flex flex-col rounded-2xl border border-border bg-surface-raised p-6">
                <p className="font-semibold text-text-primary">{pkg.name}</p>
                <p className="mt-2 text-sm text-text-secondary">{pkg.body}</p>
                {pkg.items.length > 0 && (
                  <ul className="mt-4 flex-1 space-y-1 text-sm text-text-secondary">
                    {pkg.items.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                )}
                <Link
                  href={`/education-access/sponsor?package=${pkg.id}&interest=${pkg.interest}`}
                  className="mt-5 inline-block rounded-full bg-brand px-5 py-2 text-center text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                >
                  {pkg.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Flagship program */}
        <section className="mx-auto max-w-4xl px-6 py-12">
          <div className="rounded-2xl border border-brand/30 bg-brand/5 p-8 text-center">
            <span className="text-xs font-medium uppercase tracking-wide text-brand-text">Flagship Program</span>
            <h2 className="mx-auto mt-2 max-w-2xl text-h1 font-semibold text-text-primary">
              AI Tutor for 10,000 Nigerian Students
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-text-secondary">
              A flagship SmartPrepAfrica Education Access Initiative program designed to expand
              access to AI-supported learning and exam preparation for underserved students. This
              is a program goal we are working toward, not a milestone already reached.
            </p>
            <ul className="mx-auto mt-5 max-w-xl space-y-1 text-left text-sm text-text-secondary">
              <li>· Reach 10,000 students</li>
              <li>· Provide structured exam preparation</li>
              <li>· Provide access to AI-supported learning</li>
              <li>· Improve access to quality educational resources</li>
              <li>· Partner with schools and community organizations</li>
              <li>· Measure student participation and learning engagement</li>
            </ul>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link
                href="/education-access/10000-students"
                className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Support the 10,000 Students Initiative
              </Link>
              <Link
                href="/education-access/10000-students"
                className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>

        {/* Areas of focus */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-center text-h2 font-semibold text-text-primary">Areas of Focus</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {focusAreas.map((area) => (
              <div key={area.title} className="rounded-xl border border-border bg-surface-raised p-5">
                <p className="font-semibold text-text-primary">{area.title}</p>
                <p className="mt-2 text-sm text-text-secondary">{area.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-center text-h2 font-semibold text-text-primary">How It Works</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((s) => (
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

        {/* Impact dashboard — real, platform-wide figures */}
        <section id="impact" className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-center text-h2 font-semibold text-text-primary">Our Impact</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-text-secondary">
            {hasRealImpactData
              ? "Live figures from students who have redeemed a sponsor-funded seat on SmartPrepAfrica."
              : "Our first Education Access partnerships are being developed. Impact reporting will be published as programs launch."}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {impactMetrics.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-border bg-surface-raised p-5 text-center">
                <p className="text-xs uppercase tracking-wide text-text-muted">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {metric.value.toLocaleString("en-US")}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center">
            <Link href="/education-access/impact" className="text-sm text-brand-text hover:underline">
              View Full Impact Report →
            </Link>
          </p>
        </section>

        {/* How your support is used */}
        <section className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="text-h2 font-semibold text-text-primary">How Your Support Is Used</h2>
          <p className="mt-3 text-text-secondary">
            Sponsorships and partnerships here are arranged directly with the SmartPrepAfrica team
            rather than through an online checkout — so no card-processing or platform fee is
            deducted from your gift before it funds student access.
          </p>
          <p className="mt-3 text-text-secondary">
            {legalName} is a private company, not a registered nonprofit — sponsorships through
            the Education Access Initiative are programmatic partnerships, not tax-deductible
            charitable donations. We want that clear up front, especially for organizations doing
            their own compliance review.
          </p>
        </section>

        {/* Partner with us */}
        <section id="partner" className="mx-auto max-w-6xl px-6 py-12">
          <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
            <h2 className="text-h1 font-semibold text-text-primary">
              Partner With SmartPrepAfrica to Expand Education Access
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-text-secondary">
              SmartPrepAfrica works with foundations, corporations, NGOs, diaspora organizations,
              and education partners to provide students with access to digital learning, exam
              preparation, and AI-supported education.
            </p>
            <div className="mx-auto mt-8 grid max-w-4xl gap-4 text-left sm:grid-cols-2">
              {partnershipCategories.map((cat) => (
                <div key={cat.title} className="rounded-xl border border-border bg-surface p-5">
                  <p className="font-semibold text-text-primary">{cat.title}</p>
                  <p className="mt-2 text-sm text-text-secondary">{cat.body}</p>
                </div>
              ))}
            </div>
            <Link
              href="/education-access?interest=FOUNDATION_PARTNERSHIP#sponsor-form"
              className="mt-8 inline-block rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Request Partnership Information
            </Link>
            <p className="mx-auto mt-4 max-w-xl text-xs text-text-muted">
              Read the full{" "}
              <Link href="/education-access/partners" className="text-brand-text hover:underline">
                partnership overview for foundations and institutional funders
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Sponsor / partnership enquiry form */}
        <section id="sponsor-form" className="mx-auto max-w-2xl px-6 py-12">
          <h2 className="text-h2 font-semibold text-text-primary">Get in Touch</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Tell us how you&apos;d like to support the Education Access Initiative, and our team
            will follow up.
          </p>
          <div className="mt-6">
            <EducationAccessInquiryForm defaultInterest={interest} defaultPackage={packageId} schools={schools} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
