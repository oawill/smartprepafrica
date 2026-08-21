import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalContent } from "@/components/legal/legal-content";
import { getActiveDocument } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "Partner Program Terms",
  description: "Terms governing the SmartPrepAfrica.com Partner Program, including commission qualification and payouts.",
};

export default async function PartnerProgramTermsPage() {
  const doc = await getActiveDocument("PARTNER_PROGRAM");
  if (!doc) notFound();

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{doc.title}</h1>
      <p className="mt-2 text-xs text-slate-500">
        Version {doc.version} · Last Updated:{" "}
        {new Date(doc.effectiveAt).toLocaleDateString("en-NG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <LegalContent content={doc.content} />
    </section>
  );
}
