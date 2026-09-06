import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { ToeflEmptyState } from "@/components/toefl/toefl-empty-state";
import { isToeflEnabled } from "@/lib/toefl/config";
import { startMockExam } from "@/app/international-exams/toefl/mock-exam/actions";

export const metadata: Metadata = {
  title: "TOEFL Mock Exam",
};

export default async function ToeflMockExamPage() {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const contentCount = await prisma.toeflContent.count({ where: { status: "PUBLISHED" } });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/toefl" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to TOEFL overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Mock Exam</h1>
      <p className="mt-2 text-sm text-text-secondary">
        A full-length, timed practice exam covering every available Reading and Listening question,
        plus every available Writing and Speaking prompt — TOEFL iBT style.
      </p>
      <p className="mt-4 text-xs text-text-muted">
        The Reading and Listening section is timed and will move on automatically when time runs out,
        just like the real exam. Your Estimated SmartPrepAfrica Readiness Score is calculated from your
        Reading and Listening performance, which SmartPrepAfrica can score automatically today. Your
        Writing and Speaking responses are recorded for practice and review, but AI evaluation for those
        two skills is not currently available — they are not included in the estimated score.
      </p>

      <div className="mt-8">
        {contentCount === 0 ? (
          <ToeflEmptyState message="Mock exam content is coming soon." />
        ) : (
          <Card>
            <p className="text-sm text-text-secondary">
              Takes about 45-60 minutes. You&apos;ll move through each section in order and can&apos;t go
              back once a section is done — the same as the real exam.
            </p>
            <form action={startMockExam} className="mt-4">
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
