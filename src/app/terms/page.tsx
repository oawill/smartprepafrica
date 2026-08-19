import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/brand/public-header";
import { Footer } from "@/components/brand/footer";
import { LegalContent } from "@/components/legal/legal-content";
import { getActiveDocument } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "Terms & Conditions | Educom",
  description: "The terms and conditions governing use of the Educom and SmartPrepAfrica platform.",
};

export default async function TermsPage() {
  const doc = await getActiveDocument("TERMS");
  if (!doc) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-3xl font-semibold">Terms & Conditions</h1>
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
      </main>

      <Footer />
    </div>
  );
}
