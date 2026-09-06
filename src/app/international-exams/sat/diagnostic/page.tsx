import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { SatEmptyState } from "@/components/sat/sat-empty-state";
import { isSatEnabled, SAT_CONFIG } from "@/lib/sat/config";
import { startSatDiagnostic } from "@/app/international-exams/sat/diagnostic/actions";

export const metadata: Metadata = {
  title: "SAT Diagnostic Test",
};

export default async function SatDiagnosticPage() {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const [readingWritingCount, mathCount] = await Promise.all([
    prisma.satContent.count({ where: { section: "READING_WRITING", status: "PUBLISHED" } }),
    prisma.satContent.count({ where: { section: "MATH", status: "PUBLISHED" } }),
  ]);
  const contentAvailable = readingWritingCount > 0 && mathCount > 0;
  const itemCount =
    Math.min(readingWritingCount, SAT_CONFIG.diagnosticItemsPerSection) +
    Math.min(mathCount, SAT_CONFIG.diagnosticItemsPerSection);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/sat" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to SAT overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Diagnostic Test</h1>
      <p className="mt-2 text-sm text-text-secondary">
        A short, mixed test covering Reading and Writing, and Math, to estimate your starting SAT readiness.
      </p>
      <p className="mt-4 text-xs text-text-muted">
        This produces a SmartPrepAfrica Estimated SAT Readiness Score. It is not an official College Board SAT
        score.
      </p>

      <div className="mt-8">
        {!contentAvailable ? (
          <SatEmptyState message="Diagnostic content is coming soon." />
        ) : (
          <Card>
            <p className="text-sm text-text-secondary">
              {itemCount} questions across Reading and Writing, and Math.
            </p>
            <form action={startSatDiagnostic} className="mt-4">
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Start Diagnostic Test
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
