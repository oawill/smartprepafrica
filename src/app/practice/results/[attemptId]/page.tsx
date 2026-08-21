import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asOptions } from "@/lib/practice-types";
import { examLabels, examSlugFor } from "@/lib/exam-slugs";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";

export default async function ResultsPage({
  params,
}: PageProps<"/practice/results/[attemptId]">) {
  const { attemptId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      responses: {
        orderBy: { order: "asc" },
        include: { question: true },
      },
    },
  });

  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.submittedAt) redirect(`/practice/session/${attempt.id}`);

  const correctCount = attempt.responses.filter((r) => r.isCorrect).length;

  const missedTopicCounts = new Map<string, number>();
  for (const r of attempt.responses) {
    if (r.isCorrect !== false) continue;
    const topic = r.question.topic;
    if (!topic) continue;
    missedTopicCounts.set(topic, (missedTopicCounts.get(topic) ?? 0) + 1);
  }
  const weakTopics = [...missedTopicCounts.entries()].sort((a, b) => b[1] - a[1]);

  const recommendedLessons = weakTopics.length
    ? await prisma.lesson.findMany({
        where: {
          topic: { in: weakTopics.map(([topic]) => topic) },
          module: { course: { published: true } },
        },
        include: { module: { include: { course: { select: { id: true, title: true } } } } },
        take: 4,
      })
    : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <Link href="/practice" className="text-sm text-slate-400 hover:text-white">
          ← Back to exams
        </Link>
        <AiCoachPanel
          context={{}}
          defaultMode="EXAM_PREP"
          suggestedPrompts={[
            "What should I study today?",
            "What am I weak at?",
            "Quiz me on my weakest topic",
            "Am I ready for my exam?",
          ]}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {examLabels[attempt.exam]} · {attempt.mode.replace("_", " ")}
        </p>
        <p className="mt-2 text-5xl font-semibold text-orange-400">
          {Math.round(attempt.score ?? 0)}%
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {correctCount} of {attempt.totalItems} correct
        </p>
        <Link
          href={`/practice/${examSlugFor(attempt.exam)}`}
          className="mt-4 inline-block rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
        >
          Retest
        </Link>
      </div>

      {weakTopics.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm font-medium text-slate-300">Weak concepts</p>
            <ul className="mt-2 space-y-1 text-sm">
              {weakTopics.map(([topic, missed]) => (
                <li key={topic} className="flex justify-between text-slate-300">
                  <span>{topic}</span>
                  <span className="text-slate-500">{missed} missed</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-orange-800 bg-orange-950/30 p-5">
            <p className="text-sm font-medium text-orange-300">Recommended review</p>
            {recommendedLessons.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                No lessons cover these topics yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {recommendedLessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/educom/${lesson.module.course.id}/lessons/${lesson.id}`}
                      className="text-orange-300 hover:underline"
                    >
                      {lesson.title}
                    </Link>
                    <span className="text-slate-500"> — {lesson.module.course.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {attempt.responses.map((response, i) => {
          const options = asOptions(response.question.options);
          return (
            <div
              key={response.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <p className="text-xs text-slate-500">Question {i + 1}</p>
              <p className="mt-1 font-medium">{response.question.prompt}</p>

              <div className="mt-3 space-y-1.5 text-sm">
                {options.map((option) => {
                  const isCorrectOption =
                    option.key === response.question.correctOption;
                  const isSelected = option.key === response.selectedOption;
                  return (
                    <div
                      key={option.key}
                      className={`rounded-lg px-3 py-2 ${
                        isCorrectOption
                          ? "bg-green-900/40 text-green-300"
                          : isSelected
                            ? "bg-red-900/40 text-red-300"
                            : "text-slate-400"
                      }`}
                    >
                      <span className="font-semibold">{option.key}.</span>{" "}
                      {option.text}
                      {isCorrectOption && " ✓"}
                      {isSelected && !isCorrectOption && " (your answer)"}
                    </div>
                  );
                })}
              </div>

              {response.question.explanation && (
                <p className="mt-3 text-xs text-slate-500">
                  {response.question.explanation}
                </p>
              )}

              {response.isCorrect === false && (
                <div className="mt-3">
                  <AiCoachPanel
                    context={{}}
                    defaultMode="ASK"
                    triggerLabel="Ask AI Coach"
                    triggerClassName="inline-flex items-center gap-1.5 rounded-full border border-orange-700 px-3 py-1.5 text-xs font-medium text-orange-300 hover:border-orange-500"
                    suggestedPrompts={[
                      "Why was my answer wrong?",
                      "Explain the solution",
                      "Give me a similar question",
                      "Show me the shortcut",
                    ]}
                    focusQuestion={{
                      prompt: `${response.question.prompt}\nOptions: ${options.map((o) => `${o.key}) ${o.text}`).join(", ")}`,
                      studentAnswer: response.selectedOption
                        ? `${response.selectedOption}) ${options.find((o) => o.key === response.selectedOption)?.text ?? ""}`
                        : null,
                      correctAnswer: `${response.question.correctOption}) ${options.find((o) => o.key === response.question.correctOption)?.text ?? ""}`,
                      explanation: response.question.explanation,
                      topic: response.question.topic,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
