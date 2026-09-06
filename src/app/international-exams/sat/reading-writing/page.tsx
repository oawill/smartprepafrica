import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { SatEmptyState } from "@/components/sat/sat-empty-state";
import { isSatEnabled } from "@/lib/sat/config";
import { startReadingWritingPractice } from "@/app/international-exams/sat/reading-writing/actions";

export const metadata: Metadata = {
  title: "SAT Reading and Writing Practice",
};

export default async function SatReadingWritingPage() {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const contentCount = await prisma.satContent.count({
    where: { section: "READING_WRITING", status: "PUBLISHED" },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/sat" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to SAT overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Reading and Writing Practice</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Short passages and standalone questions across Information and Ideas, Craft and Structure, Expression of
        Ideas, and Standard English Conventions.
      </p>

      <div className="mt-8">
        {contentCount === 0 ? (
          <SatEmptyState message="Reading and Writing practice content is coming soon." />
        ) : (
          <Card>
            <p className="text-sm text-text-secondary">{contentCount} questions available.</p>
            <form action={startReadingWritingPractice} className="mt-4">
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Start Reading and Writing Practice
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
