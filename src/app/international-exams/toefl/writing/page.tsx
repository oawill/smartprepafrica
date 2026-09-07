import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { ToeflEmptyState } from "@/components/toefl/toefl-empty-state";
import { isToeflEnabled } from "@/lib/toefl/config";
import { startWritingPractice } from "@/app/international-exams/toefl/writing/actions";

export const metadata: Metadata = {
  title: "TOEFL Writing Practice",
};

export default async function ToeflWritingPage() {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession("/international-exams/toefl/writing");
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const prompts = await prisma.toeflContent.findMany({
    where: { skill: "WRITING", status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/toefl" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to TOEFL overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Writing Practice</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Pick a prompt and write a timed essay, TOEFL independent writing task style.
      </p>

      <div className="mt-8 space-y-4">
        {prompts.length === 0 ? (
          <ToeflEmptyState message="Writing prompts are coming soon." />
        ) : (
          prompts.map((p) => (
            <Card key={p.id}>
              <p className="text-sm text-text-primary">{p.prompt}</p>
              <form action={startWritingPractice.bind(null, p.id)} className="mt-4">
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                >
                  Write about this prompt
                </button>
              </form>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
