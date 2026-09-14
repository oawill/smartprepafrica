import type { Metadata } from "next";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { EducationAccessInquiryForm } from "@/components/education-access/inquiry-form";
import { findSponsorPackage } from "@/lib/education-access/packages";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Sponsor Students | SmartPrepAfrica Education Access",
  description:
    "Submit your sponsorship interest to the SmartPrepAfrica Education Access Initiative and help expand access to digital learning and exam preparation.",
};

export default async function EducationAccessSponsorPage({
  searchParams,
}: {
  searchParams: Promise<{ interest?: string; package?: string }>;
}) {
  const { interest, package: packageId } = await searchParams;
  const selectedPackage = findSponsorPackage(packageId);
  const schools = await prisma.school.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-2xl px-6 py-16">
          <h1 className="text-h1 font-semibold text-text-primary">
            {selectedPackage ? `Sponsorship Interest: ${selectedPackage.name}` : "Sponsorship Interest"}
          </h1>
          <p className="mt-3 text-text-secondary">
            Tell us about your organization and sponsorship goals, and our team will follow up to
            confirm the details.
          </p>
          <div className="mt-8">
            <EducationAccessInquiryForm defaultInterest={interest} defaultPackage={packageId} schools={schools} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
