import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { AnswerOption } from "@/components/exam/answer-option";
import { MessageContent } from "@/components/ai-coach/message-content";
import { SatAskAi } from "@/components/sat/sat-ask-ai";
import { asOptions } from "@/lib/practice-types";
import { isSatEnabled } from "@/lib/sat/config";
import { retryWeakSkills } from "@/app/international-exams/sat/drill/actions";

const DIFFICULTY_VALUE: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };
const DIFFICULTY_NAME = ["", "Easy", "Medium", "Hard"];

export default async function SatDrillResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  if (!isSatEnabled()) notFound();
  const { attemptId } = await params;
  const session = await requireStudentSession(`/international-exams/sat/drill/results/${attemptId}`);
  await requireExamProductEntitlement(session.user.id, "SAT");
  const { filter } = await searchParams;

  const attempt = await prisma.satAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id || attempt.kind !== "DRILL") notFound();
  if (!attempt.submittedAt) redirect(`/international-exams/sat/drill/session/${attemptId}`);

  const total = attempt.items.length;
  const correctCount = attempt.items.filter((i) => i.isCorrect).length;
  const incorrectCount = attempt.items.filter((i) => i.isCorrect === false).length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const durationSec = Math.max(
    0,
    Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000)
  );
  const durationLabel = `${Math.floor(durationSec / 60)} min ${durationSec % 60} sec`;

  const avgDifficulty =
    total > 0
      ? Math.round(attempt.items.reduce((sum, i) => sum + DIFFICULTY_VALUE[i.content.difficulty], 0) / total)
      : 0;

  const skillBuckets = new Map<string, { label: string; correct: number; total: number }>();
  for (const item of attempt.items) {
    const label = item.content.skill ?? item.content.domain;
    const bucket = skillBuckets.get(label) ?? { label, correct: 0, total: 0 };
    bucket.total += 1;
    if (item.isCorrect) bucket.correct += 1;
    skillBuckets.set(label, bucket);
  }
  const bucketsWithData = [...skillBuckets.values()];
  const strongest = bucketsWithData
    .filter((b) => b.total > 0)
    .sort((a, b) => b.correct / b.total - a.correct / a.total)[0];
  const weakest = bucketsWithData
    .filter((b) => b.total > 0)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)[0];

  const focusItem = attempt.items.find((i) => i.isCorrect === false) ?? attempt.items[0];

  const visibleItems = filter === "mistakes" ? attempt.items.filter((i) => i.isCorrect === false) : attempt.items;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/international-exams/sat/drill" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Drills
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Drill Complete</h1>

      <div className="mt-6">
        <Card title="Results">
          <div className="text-3xl font-semibold text-text-primary">
            {correctCount} / {total} Correct
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {accuracy}% Accuracy · {durationLabel}
          </p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card title="Strongest Skill">
          <p className="text-sm text-text-secondary">
            {strongest ? `${strongest.label} (${Math.round((strongest.correct / strongest.total) * 100)}%)` : "—"}
          </p>
        </Card>
        <Card title="Needs Improvement">
          <p className="text-sm text-text-secondary">
            {weakest && weakest.correct < weakest.total
              ? `${weakest.label} (${Math.round((weakest.correct / weakest.total) * 100)}%)`
              : "—"}
          </p>
        </Card>
        <Card title="Questions Correct / Incorrect">
          <p className="text-sm text-text-secondary">
            {correctCount} correct · {incorrectCount} incorrect
          </p>
        </Card>
        <Card title="Average Difficulty">
          <p className="text-sm text-text-secondary">{DIFFICULTY_NAME[avgDifficulty] || "—"}</p>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/international-exams/sat/drill/results/${attemptId}?filter=mistakes`}
          className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
        >
          Review Mistakes
        </Link>
        {filter === "mistakes" && (
          <Link
            href={`/international-exams/sat/drill/results/${attemptId}`}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
          >
            Show All
          </Link>
        )}
        <form action={retryWeakSkills}>
          <input type="hidden" name="attemptId" value={attemptId} />
          <button
            type="submit"
            className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
          >
            Retry Weak Skills
          </button>
        </form>
        <Link
          href="/international-exams/sat/drill"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Start Another Drill
        </Link>
        {focusItem && (
          <SatAskAi
            section={focusItem.content.section}
            domain={focusItem.content.domain}
            passage={focusItem.content.passage}
            prompt={focusItem.content.prompt}
            options={focusItem.content.options}
            correctOption={focusItem.content.correctOption}
            correctValue={focusItem.content.correctValue}
            selectedOption={focusItem.selectedOption}
            numericAnswer={focusItem.numericAnswer}
            explanation={focusItem.content.explanation}
            triggerLabel="Ask AI Tutor"
          />
        )}
      </div>

      <div className="mt-8 space-y-6">
        {visibleItems.map((item) => {
          const options = asOptions(item.content.options);
          return (
            <Card key={item.id} title={`${item.content.domain}${item.content.skill ? ` — ${item.content.skill}` : ""}`}>
              {item.content.passage && (
                <div className="overflow-x-auto prose-passage text-xs leading-6 text-text-muted">{item.content.passage}</div>
              )}
              <div className="mt-3 overflow-x-auto text-sm font-medium text-text-primary">
                <MessageContent content={item.content.prompt} />
              </div>
              {options.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {options.map((opt) => {
                    const state =
                      opt.key === item.content.correctOption
                        ? "correct"
                        : opt.key === item.selectedOption
                          ? "incorrect"
                          : "default";
                    return (
                      <AnswerOption key={opt.key} optionKey={opt.key} state={state}>
                        {opt.text}
                      </AnswerOption>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm text-text-secondary">
                  Your answer: {item.numericAnswer ?? "—"} · Correct answer: {item.content.correctValue}
                </p>
              )}
              {item.content.explanation && (
                <p className="mt-3 text-xs text-text-secondary">{item.content.explanation}</p>
              )}
              {item.isCorrect === false && (
                <div className="mt-3">
                  <SatAskAi
                    section={item.content.section}
                    domain={item.content.domain}
                    passage={item.content.passage}
                    prompt={item.content.prompt}
                    options={item.content.options}
                    correctOption={item.content.correctOption}
                    correctValue={item.content.correctValue}
                    selectedOption={item.selectedOption}
                    numericAnswer={item.numericAnswer}
                    explanation={item.content.explanation}
                    triggerLabel="Ask AI Tutor"
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
