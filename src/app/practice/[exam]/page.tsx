import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { examLabels, examSlugs } from "@/lib/exam-slugs";
import { startAttempt } from "@/app/practice/actions";

const modes = [
  {
    value: "STUDY_DRILL",
    label: "Study Drill",
    description: "Short, focused practice on a topic or subject. No time pressure.",
    defaultCount: 10,
  },
  {
    value: "CBT_PRACTICE",
    label: "CBT Practice",
    description: "Timed, computer-based test practice similar to the real exam interface.",
    defaultCount: 20,
  },
  {
    value: "MOCK_EXAM",
    label: "Mock Exam",
    description: "A full-length simulation across your selected subjects.",
    defaultCount: 40,
  },
] as const;

export default async function ExamSetupPage({
  params,
}: PageProps<"/practice/[exam]">) {
  const { exam: examSlug } = await params;
  const exam = examSlugs[examSlug];
  if (!exam) notFound();

  const subjects = await prisma.subject.findMany({
    where: { questions: { some: { exam } } },
    select: {
      id: true,
      name: true,
      _count: { select: { questions: { where: { exam } } } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/practice" className="text-sm text-slate-400 hover:text-white">
        ← Back to exams
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">{examLabels[exam]} practice</h1>
      <p className="mt-2 text-slate-400">
        Choose your subjects and a practice mode to get started.
      </p>

      {subjects.length === 0 ? (
        <p className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
          No questions are available for {examLabels[exam]} yet. Check back
          soon.
        </p>
      ) : (
        <form action={startAttempt} className="mt-8 space-y-8">
          <input type="hidden" name="exam" value={exam} />

          <fieldset>
            <legend className="text-sm font-medium text-slate-300">
              Subjects
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {subjects.map((subject) => (
                <label
                  key={subject.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300"
                >
                  <input
                    type="checkbox"
                    name="subjects"
                    value={subject.id}
                    defaultChecked
                    className="accent-orange-500"
                  />
                  {subject.name}
                  <span className="ml-auto text-xs text-slate-500">
                    {subject._count.questions} qs
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-slate-300">Mode</legend>
            <div className="mt-3 space-y-2">
              {modes.map((mode, i) => (
                <label
                  key={mode.value}
                  className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-3 text-sm"
                >
                  <input
                    type="radio"
                    name="mode"
                    value={mode.value}
                    defaultChecked={i === 0}
                    className="mt-1 accent-orange-500"
                  />
                  <span>
                    <span className="font-medium text-slate-200">
                      {mode.label}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {mode.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="text-sm font-medium text-slate-300" htmlFor="count">
              Number of questions
            </label>
            <input
              id="count"
              name="count"
              type="number"
              min={5}
              max={50}
              defaultValue={10}
              className="mt-2 w-32 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
          </div>

          <button
            type="submit"
            className="rounded-full bg-orange-500 px-6 py-3 text-sm font-medium text-slate-950 hover:bg-orange-400"
          >
            Start practice
          </button>
        </form>
      )}
    </div>
  );
}
