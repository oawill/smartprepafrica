import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { ToeflEmptyState } from "@/components/toefl/toefl-empty-state";
import { isToeflEnabled } from "@/lib/toefl/config";
import { startReadingPractice } from "@/app/international-exams/toefl/reading/actions";

export const metadata: Metadata = {
  title: "TOEFL Reading Practice",
};

export default async function ToeflReadingPage() {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession("/international-exams/toefl/reading");
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const contentCount = await prisma.toeflContent.count({ where: { skill: "READING", status: "PUBLISHED" } });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/toefl" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to TOEFL overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Reading Practice</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Read a short passage and answer a comprehension question, TOEFL iBT style.
      </p>

      <div className="mt-8">
        {contentCount === 0 ? (
          <ToeflEmptyState message="Reading practice content is coming soon." />
        ) : (
          <Card>
            <p className="text-sm text-text-secondary">{contentCount} passages available.</p>
            <form action={startReadingPractice} className="mt-4">
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Start Reading Practice
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
