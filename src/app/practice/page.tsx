import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { examLabels, examSlugFor } from "@/lib/exam-slugs";
import type { ExamType } from "@prisma/client";

export default async function PracticePage() {
  const counts = await prisma.question.groupBy({
    by: ["exam"],
    _count: { _all: true },
  });
  const countByExam = new Map(counts.map((c) => [c.exam, c._count._all]));

  const exams = Object.keys(examLabels) as ExamType[];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link href="/" className="text-sm text-slate-400 hover:text-white">
        ← Back home
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Exam practice</h1>
      <p className="mt-2 max-w-2xl text-slate-400">
        Choose an exam to start a Study Drill, CBT practice session, or full
        mock exam.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {exams.map((exam) => {
          const count = countByExam.get(exam) ?? 0;
          return (
            <Link
              key={exam}
              href={`/practice/${examSlugFor(exam)}`}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-600"
            >
              <p className="font-semibold text-orange-400">
                {examLabels[exam]}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {count > 0
                  ? `${count} question${count === 1 ? "" : "s"} available`
                  : "Question bank coming soon."}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
