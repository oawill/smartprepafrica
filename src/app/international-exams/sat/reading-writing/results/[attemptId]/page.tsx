import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { AnswerOption } from "@/components/exam/answer-option";
import { MessageContent } from "@/components/ai-coach/message-content";
import { asOptions } from "@/lib/practice-types";
import { isSatEnabled, SAT_CONFIG } from "@/lib/sat/config";
import { SatAskAi } from "@/components/sat/sat-ask-ai";

export default async function SatReadingWritingResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  if (!isSatEnabled()) notFound();
  const { attemptId } = await params;
  const session = await requireStudentSession(`/international-exams/sat/reading-writing/results/${attemptId}`);
  await requireExamProductEntitlement(session.user.id, "SAT");

  const attempt = await prisma.satAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.submittedAt) redirect(`/international-exams/sat/reading-writing/session/${attemptId}`);

  const correctCount = attempt.items.filter((i) => i.isCorrect).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link
        href="/international-exams/sat/reading-writing"
        className="text-sm text-text-secondary hover:text-text-primary"
      >
        ← Back to Reading and Writing Practice
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Reading and Writing Results</h1>

      <div className="mt-6">
        <Card title="SmartPrepAfrica Estimated Section Score">
          <div className="text-3xl font-semibold text-text-primary">
            {attempt.readingWritingScore ?? "--"}
            <span className="text-base font-normal text-text-muted"> / {SAT_CONFIG.scoreScale.sectionMax}</span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {correctCount} of {attempt.items.length} correct
          </p>
        </Card>
      </div>

      <div className="mt-8 space-y-6">
        {attempt.items.map((item, i) => {
          const options = asOptions(item.content.options);
          return (
            <Card key={item.id} title={`Question ${i + 1}`}>
              {item.content.passage && (
                <div className="prose-passage text-xs leading-6 text-text-muted">{item.content.passage}</div>
              )}
              <div className="mt-3 text-sm font-medium text-text-primary">
                <MessageContent content={item.content.prompt} />
              </div>
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
