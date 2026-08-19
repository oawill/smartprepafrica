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
      <Link href="/practice" className="text-sm text-slate-400 hover:text-white">
        ← Back to exams
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Review</h1>
      <p className="mt-2 text-slate-400">
        Every practice session and mock exam you&apos;ve completed.
      </p>

      {attempts.length === 0 ? (
        <p className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
          No completed sessions yet.{" "}
          <Link href="/practice" className="text-orange-400 hover:underline">
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
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm hover:border-slate-600"
            >
              <span>
                <span className="font-medium text-slate-100">
                  {examLabels[attempt.exam]}
                </span>
                <span className="ml-2 text-slate-500">
                  {attempt.mode.toLowerCase().replace("_", " ")}
                </span>
                <span className="ml-2 text-xs text-slate-600">
                  {attempt.submittedAt!.toLocaleDateString()}
                </span>
              </span>
              <span className="font-medium text-orange-400">
                {attempt.score !== null ? `${Math.round(attempt.score)}%` : "—"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
