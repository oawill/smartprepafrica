import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { SatEmptyState } from "@/components/sat/sat-empty-state";
import { isSatEnabled, SAT_CONFIG } from "@/lib/sat/config";
import { startSatMockExam } from "@/app/international-exams/sat/mock-exam/actions";

export const metadata: Metadata = {
  title: "SAT Full-Length Mock Exam",
};

export default async function SatMockExamPage() {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const [readingWritingCount, mathCount] = await Promise.all([
    prisma.satContent.count({ where: { section: "READING_WRITING", status: "PUBLISHED" } }),
    prisma.satContent.count({ where: { section: "MATH", status: "PUBLISHED" } }),
  ]);
  const minNeeded = SAT_CONFIG.mockExam.module1Size + SAT_CONFIG.mockExam.module2Size;
  const contentAvailable = readingWritingCount >= minNeeded && mathCount >= minNeeded;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/sat" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to SAT overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Full-Length Mock Exam</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Instructions → Reading and Writing (Module 1, then an adaptive Module 2) → a short break → Math (Module 1,
        then an adaptive Module 2) → Results.
      </p>
      <p className="mt-4 text-xs text-text-muted">
        This is a SmartPrepAfrica SAT Practice Simulation, not an official College Board test. Module 2&apos;s
        difficulty is chosen by SmartPrepAfrica&apos;s own approximation of adaptive routing, not the real, proprietary
        College Board algorithm.
      </p>

      <div className="mt-8">
        {!contentAvailable ? (
          <SatEmptyState message="Full-length mock exam content is coming soon." />
        ) : (
          <Card>
            <p className="text-sm text-text-secondary">
              Each module is timed. Once you submit a module you can&apos;t go back to it — the same as the real
              exam.
            </p>
            <form action={startSatMockExam} className="mt-4">
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Start Mock Exam
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
