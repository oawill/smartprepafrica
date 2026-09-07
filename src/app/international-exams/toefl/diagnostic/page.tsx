import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { ToeflEmptyState } from "@/components/toefl/toefl-empty-state";
import { isToeflEnabled } from "@/lib/toefl/config";
import { startDiagnosticTest } from "@/app/international-exams/toefl/diagnostic/actions";

export const metadata: Metadata = {
  title: "TOEFL Diagnostic Test",
};

export default async function ToeflDiagnosticPage() {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession("/international-exams/toefl/diagnostic");
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const contentCount = await prisma.toeflContent.count({ where: { status: "PUBLISHED" } });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/toefl" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to TOEFL overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Diagnostic Test</h1>
      <p className="mt-2 text-sm text-text-secondary">
        A short, mixed-skill test covering Reading, Listening, Writing, and Speaking — TOEFL iBT style.
      </p>
      <p className="mt-4 text-xs text-text-muted">
        Your Estimated SmartPrepAfrica Readiness Score is calculated from your Reading and Listening
        performance. Your Writing and Speaking responses are recorded for practice and review, with
        AI feedback shown on their own results when available, but they are not included in the
        estimated score.
      </p>

      <div className="mt-8">
        {contentCount === 0 ? (
          <ToeflEmptyState message="Diagnostic content is coming soon." />
        ) : (
          <Card>
            <p className="text-sm text-text-secondary">
              Takes about 20-30 minutes. You&apos;ll move through each section in order and can&apos;t go
              back once a section is done — the same as the real exam.
            </p>
            <form action={startDiagnosticTest} className="mt-4">
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
