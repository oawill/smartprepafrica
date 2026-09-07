import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { SatEmptyState } from "@/components/sat/sat-empty-state";
import { isSatEnabled } from "@/lib/sat/config";
import { startMathPractice } from "@/app/international-exams/sat/math/actions";

export const metadata: Metadata = {
  title: "SAT Math Practice",
};

export default async function SatMathPage() {
  if (!isSatEnabled()) notFound();
  const session = await requireStudentSession("/international-exams/sat/math");
  await requireExamProductEntitlement(session.user.id, "SAT");

  const contentCount = await prisma.satContent.count({ where: { section: "MATH", status: "PUBLISHED" } });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/sat" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to SAT overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Math Practice</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Questions across Algebra, Advanced Math, Problem-Solving and Data Analysis, and Geometry and Trigonometry —
        including multiple-choice and student-produced (numeric) response items.
      </p>

      <div className="mt-8">
        {contentCount === 0 ? (
          <SatEmptyState message="Math practice content is coming soon." />
        ) : (
          <Card>
            <p className="text-sm text-text-secondary">{contentCount} questions available.</p>
            <form action={startMathPractice} className="mt-4">
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Start Math Practice
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
