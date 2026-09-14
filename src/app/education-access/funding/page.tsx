import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { FundingContactForm } from "@/components/education-access/funding-contact-form";

export const metadata: Metadata = {
  title: "Education Funding & Partnerships | SmartPrepAfrica",
  description:
    "Partner with SmartPrepAfrica to expand access to digital learning, exam preparation, and AI-supported education for African students.",
  openGraph: {
    title: "Education Funding & Partnerships | SmartPrepAfrica",
    description:
      "Partner with SmartPrepAfrica to expand access to digital learning, exam preparation, and AI-supported education for African students.",
  },
};

const whySmartPrepAfrica = [
  {
    title: "Education Access",
    body: "SmartPrepAfrica is designed to make structured digital learning and exam preparation accessible to students across different economic and geographic circumstances.",
  },
  {
    title: "Technology",
    body: "The platform combines digital lessons, exam preparation, practice questions, study guides, learning analytics, AI-supported learning, and school participation.",
  },
  {
    title: "Scalability",
    body: "A technology-driven platform can extend educational resources beyond individual classrooms and schools, without being limited to the reach of any single physical location.",
  },
  {
    title: "Measurability",
    body: "Sponsored accounts, learning activity, exam practice, lessons, and program participation can be tracked for reporting purposes.",
  },
  {
    title: "Partnership Flexibility",
    body: "Partners may support individual students, student cohorts, schools, communities, states, or specific education-access initiatives.",
  },
] as const;

const waysToPartner = [
  { title: "Program Sponsor", body: "Fund a defined number of students." },
  { title: "School Sponsor", body: "Support one or more participating schools." },
  { title: "Community Sponsor", body: "Support students within a defined community or region." },
  {
    title: "Strategic Partner",
    body: "Support technology, curriculum, infrastructure, connectivity, or educational delivery.",
  },
  { title: "Foundation Partner", body: "Provide grant funding for a defined education-access program." },
  {
    title: "Corporate CSR Partner",
    body: "Fund student or school access as part of a company's social-impact strategy.",
  },
] as const;

export default function EducationAccessFundingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h1 className="text-h1 font-semibold text-text-primary">
            Partner With SmartPrepAfrica to Expand Education Access Across Africa
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
            SmartPrepAfrica combines digital learning, exam preparation, school partnerships, and
            AI-supported education to help more students access quality learning opportunities.
            Through the SmartPrepAfrica Education Access Initiative, foundations, corporations,
            NGOs, development organizations, and philanthropic partners can support measurable
            programs designed to expand access to educational resources.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="#contact"
              className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Request a Partnership Conversation
            </Link>
            <Link
              href="/education-access/10000-students"
              className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-text-primary hover:border-text-muted"
            >
              View Our Flagship Initiative
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-center text-h2 font-semibold text-text-primary">Why SmartPrepAfrica</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {whySmartPrepAfrica.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-surface-raised p-5">
                <p className="font-semibold text-text-primary">{item.title}</p>
                <p className="mt-2 text-sm text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-center text-h2 font-semibold text-text-primary">Ways to Partner</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {waysToPartner.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-surface-raised p-5">
                <p className="font-semibold text-text-primary">{item.title}</p>
                <p className="mt-2 text-sm text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/education-access#choose-your-impact"
              className="inline-block rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Explore Partnership Opportunities
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-12 text-center">
          <p className="text-sm text-text-secondary">
            Read the{" "}
            <Link href="/education-access/concept-note" className="text-brand-text hover:underline">
              one-page concept note
            </Link>
            , the{" "}
            <Link href="/education-access/proposal" className="text-brand-text hover:underline">
              full funding proposal
            </Link>
            , or visit our{" "}
            <Link href="/education-access/resources" className="text-brand-text hover:underline">
              resource center
            </Link>
            .
          </p>
        </section>

        <section id="contact" className="mx-auto max-w-2xl px-6 py-12">
          <h2 className="text-h2 font-semibold text-text-primary">Request a Partnership Conversation</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Tell us about your organization&apos;s interests, and our team will follow up to schedule a
            conversation.
          </p>
          <div className="mt-6">
            <FundingContactForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
