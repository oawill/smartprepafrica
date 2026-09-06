import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { ToeflEmptyState } from "@/components/toefl/toefl-empty-state";
import { isToeflEnabled } from "@/lib/toefl/config";
import { startSpeakingPractice } from "@/app/international-exams/toefl/speaking/actions";

export const metadata: Metadata = {
  title: "TOEFL Speaking Practice",
};

export default async function ToeflSpeakingPage() {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const prompts = await prisma.toeflContent.findMany({
    where: { skill: "SPEAKING", status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/toefl" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to TOEFL overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Speaking Practice</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Pick a prompt, prepare for 15 seconds, then record a 45-second response — TOEFL independent speaking task
        style. Your microphone will ask for permission before recording starts.
      </p>

      <div className="mt-8 space-y-4">
        {prompts.length === 0 ? (
          <ToeflEmptyState message="Speaking prompts are coming soon." />
        ) : (
          prompts.map((p) => (
            <Card key={p.id}>
              <p className="text-sm text-text-primary">{p.prompt}</p>
              <form action={startSpeakingPractice.bind(null, p.id)} className="mt-4">
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                >
                  Speak about this prompt
                </button>
              </form>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
