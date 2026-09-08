import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { examLabels, examSlugs } from "@/lib/exam-slugs";
import { startAttempt } from "@/app/practice/actions";
import { requireStudentSession } from "@/lib/exam-access";

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
  await requireStudentSession(`/practice/${examSlug}`);

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
      <Link href="/practice" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to exams
      </Link>
      <h1 className="mt-4 text-h1 font-semibold text-text-primary">{examLabels[exam]} practice</h1>
      <p className="mt-2 text-text-secondary">
        Choose your subjects and a practice mode to get started.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/practice/${examSlug}/readiness`}
          className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-primary hover:border-brand hover:text-brand-text"
        >
          My {examLabels[exam]} Readiness →
        </Link>
        <Link
          href={`/practice/${examSlug}/drills`}
          className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-primary hover:border-brand hover:text-brand-text"
        >
          Quick Drills →
        </Link>
        <Link
          href={`/practice/${examSlug}/subjects`}
          className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-text-primary hover:border-brand hover:text-brand-text"
        >
          Manage My Subjects →
        </Link>
      </div>

      {subjects.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-secondary">
          No questions are available for {examLabels[exam]} yet. Check back
          soon.
        </p>
      ) : (
        <form action={startAttempt} className="mt-8 space-y-8">
          <input type="hidden" name="exam" value={exam} />

          <fieldset>
            <legend className="text-sm font-medium text-text-secondary">
              Subjects
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {subjects.map((subject) => (
                <label
                  key={subject.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-secondary"
                >
                  <input
                    type="checkbox"
                    name="subjects"
                    value={subject.id}
                    defaultChecked
                    className="accent-brand"
                  />
                  {subject.name}
                  <span className="ml-auto text-xs text-text-muted">
                    {subject._count.questions} qs
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-text-secondary">Mode</legend>
            <div className="mt-3 space-y-2">
              {modes.map((mode, i) => (
                <label
                  key={mode.value}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface-raised px-3 py-3 text-sm"
                >
                  <input
                    type="radio"
                    name="mode"
                    value={mode.value}
                    defaultChecked={i === 0}
                    className="mt-1 accent-brand"
                  />
                  <span>
                    <span className="font-medium text-text-primary">
                      {mode.label}
                    </span>
                    <span className="block text-xs text-text-muted">
                      {mode.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="text-sm font-medium text-text-secondary" htmlFor="count">
              Number of questions
            </label>
            <input
              id="count"
              name="count"
              type="number"
              min={5}
              max={50}
              defaultValue={10}
              className="mt-2 w-32 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            />
          </div>

          <button
            type="submit"
            className="rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Start practice
          </button>
        </form>
      )}
    </div>
  );
}
