import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { examLabels } from "@/lib/exam-slugs";

export default async function PracticeHistoryPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const attempts = await prisma.examAttempt.findMany({
    where: { userId: session.user.id, submittedAt: { not: null } },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/practice" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to exams
      </Link>
      <h1 className="mt-4 text-h1 font-semibold text-text-primary">Review</h1>
      <p className="mt-2 text-text-secondary">
        Every practice session and mock exam you&apos;ve completed.
      </p>

      {attempts.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-secondary">
          No completed sessions yet.{" "}
          <Link href="/practice" className="text-brand-text hover:underline">
            Start one
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 space-y-2">
          {attempts.map((attempt) => (
            <Link
              key={attempt.id}
              href={`/practice/results/${attempt.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm hover:border-border-strong"
            >
              <span>
                <span className="font-medium text-text-primary">
                  {examLabels[attempt.exam]}
                </span>
                <span className="ml-2 text-text-muted">
                  {attempt.mode.toLowerCase().replace("_", " ")}
                </span>
                <span className="ml-2 text-xs text-text-muted">
                  {attempt.submittedAt!.toLocaleDateString()}
                </span>
              </span>
              <span className="font-medium text-brand-text">
                {attempt.score !== null ? `${Math.round(attempt.score)}%` : "—"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
