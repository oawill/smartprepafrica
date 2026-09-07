import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { ToeflEmptyState } from "@/components/toefl/toefl-empty-state";
import { isToeflEnabled } from "@/lib/toefl/config";
import { startListeningPractice } from "@/app/international-exams/toefl/listening/actions";

export const metadata: Metadata = {
  title: "TOEFL Listening Practice",
};

export default async function ToeflListeningPage() {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession("/international-exams/toefl/listening");
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const contentCount = await prisma.toeflContent.count({ where: { skill: "LISTENING", status: "PUBLISHED" } });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/toefl" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to TOEFL overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Listening Practice</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Listen to a short audio clip and answer a comprehension question, TOEFL iBT style.
      </p>

      <div className="mt-8">
        {contentCount === 0 ? (
          <ToeflEmptyState message="Listening practice content is coming soon." />
        ) : (
          <Card>
            <p className="text-sm text-text-secondary">{contentCount} audio clips available.</p>
            <form action={startListeningPractice} className="mt-4">
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Start Listening Practice
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
