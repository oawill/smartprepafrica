import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { getPlatformSettings } from "@/lib/legal/settings";

export const metadata: Metadata = {
  title: "Due Diligence | SmartPrepAfrica Education Access Initiative",
  description:
    "Institutional information for foundations and funders conducting due diligence on the SmartPrepAfrica Education Access Initiative.",
};

export default async function DueDiligencePage() {
  const settings = await getPlatformSettings();
  const legalName = settings.companyLegalName || "Cicerah Technologies Limited";

  const conditionalSections = [
    { key: "orgLeadershipNote", title: "Leadership", note: settings.orgLeadershipNote },
    { key: "orgRegistrationNote", title: "Registration", note: settings.orgRegistrationNote },
    { key: "orgGovernanceNote", title: "Program Governance", note: settings.orgGovernanceNote },
    { key: "orgDataPrivacyNote", title: "Data Privacy", note: settings.orgDataPrivacyNote },
    { key: "orgSafeguardingNote", title: "Student Safeguarding", note: settings.orgSafeguardingNote },
    { key: "orgFinancialNote", title: "Financial Information", note: settings.orgFinancialNote },
  ].filter((section) => section.note);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-h1 font-semibold text-text-primary">Due Diligence</h1>
          <p className="mt-3 text-text-secondary">
            Institutional information for foundations and funders evaluating a partnership with
            SmartPrepAfrica. Some information below is still being finalized and will be added as
            it becomes available.
          </p>

          <div className="mt-10 space-y-8">
            <div>
              <h2 className="text-h2 font-semibold text-text-primary">Organization Overview</h2>
              <p className="mt-2 text-text-secondary">
                SmartPrepAfrica is operated by {legalName}, a private company — not a registered
                nonprofit, charity, or 501(c)(3) organization.
              </p>
            </div>

            <div>
              <h2 className="text-h2 font-semibold text-text-primary">Mission</h2>
              <p className="mt-2 text-text-secondary">
                {settings.orgMissionNote ||
                  "Help students prepare smarter, learn from great educators wherever they are, and build the skills that carry them beyond the exam."}
              </p>
            </div>

            <div>
              <h2 className="text-h2 font-semibold text-text-primary">Product Overview</h2>
              <p className="mt-2 text-text-secondary">
                SmartPrepAfrica provides exam preparation for WAEC, NECO, UTME, and Post-UTME with
                an AI-assisted study coach, practice questions, and mock exams, and connects
                students to live and recorded classes from independent schools, teachers, and
                organizations.
              </p>
            </div>

            {conditionalSections.map((section) => (
              <div key={section.key}>
                <h2 className="text-h2 font-semibold text-text-primary">{section.title}</h2>
                <p className="mt-2 text-text-secondary">{section.note}</p>
              </div>
            ))}

            <div>
              <h2 className="text-h2 font-semibold text-text-primary">Impact Measurement</h2>
              <p className="mt-2 text-text-secondary">
                Real, non-fabricated impact figures are published at{" "}
                <Link href="/education-access/impact" className="text-brand-text hover:underline">
                  our Impact page
                </Link>
                .
              </p>
            </div>

            <div>
              <h2 className="text-h2 font-semibold text-text-primary">Contact Information</h2>
              <p className="mt-2 text-text-secondary">
                For further institutional information, please{" "}
                <Link href="/education-access/funding#contact" className="text-brand-text hover:underline">
                  request a partnership conversation
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
