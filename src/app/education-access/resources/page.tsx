import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";

export const metadata: Metadata = {
  title: "Resources | SmartPrepAfrica Education Access Initiative",
  description:
    "Concept notes, funding proposals, and program overviews for funders evaluating the SmartPrepAfrica Education Access Initiative.",
};

// Real, working links only — no generated PDFs. Structured so a future
// phase can add real downloadable files without changing this list's
// shape, per the brief's own "web-based for now" instruction.
const resources = [
  { title: "Concept Note", body: "A one-page overview of the Education Access Initiative.", href: "/education-access/concept-note" },
  { title: "Program Overview", body: "The Education Access Initiative's main page.", href: "/education-access" },
  { title: "Funding Proposal", body: "A full proposal document for institutional funders.", href: "/education-access/proposal" },
  { title: "AI Tutor for 10,000 Students Brief", body: "Our flagship program overview.", href: "/education-access/10000-students" },
  { title: "Impact Report", body: "Real, current impact figures.", href: "/education-access/impact" },
  { title: "Corporate Partnership Overview", body: "The Funding & Partnerships hub.", href: "/education-access/funding" },
] as const;

export default function EducationAccessResourcesPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h1 className="text-h1 font-semibold text-text-primary">Resources</h1>
          <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
            Web-based resources for foundations, corporations, and institutional partners
            evaluating the SmartPrepAfrica Education Access Initiative.
          </p>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-16">
          <div className="grid gap-4 sm:grid-cols-2">
            {resources.map((resource) => (
              <Link
                key={resource.href}
                href={resource.href}
                className="rounded-xl border border-border bg-surface-raised p-5 hover:border-brand"
              >
                <p className="font-semibold text-text-primary">{resource.title}</p>
                <p className="mt-2 text-sm text-text-secondary">{resource.body}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
