import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { AnswerOption } from "@/components/exam/answer-option";
import { MessageContent } from "@/components/ai-coach/message-content";
import { MathText } from "@/components/sat/math-text";
import { SatSectionScoreCard } from "@/components/sat/sat-section-score-card";
import { asOptions } from "@/lib/practice-types";
import { isSatEnabled, SAT_CONFIG } from "@/lib/sat/config";
import { SAT_SECTION_LABELS } from "@/lib/sat/types";

const TIER_LABEL: Record<string, string> = {
  EASIER: "the standard-difficulty Module 2",
  HARDER: "the more challenging Module 2",
};

export default async function SatMockExamResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.satAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.submittedAt) redirect(`/international-exams/sat/mock-exam/session/${attemptId}`);

  const readingWritingItems = attempt.items.filter((i) => i.content.section === "READING_WRITING");
  const mathItems = attempt.items.filter((i) => i.content.section === "MATH");

  function renderModule(items: typeof readingWritingItems, module: 1 | 2) {
    const moduleItems = items.filter((i) => i.module === module);
    return (
      <div className="mt-4 space-y-6">
        <h3 className="text-sm font-semibold text-text-secondary">Module {module}</h3>
        {moduleItems.map((item, i) => {
          const isNumeric = item.content.questionType === "STUDENT_PRODUCED_RESPONSE";
          const options = isNumeric ? [] : asOptions(item.content.options);
          return (
            <Card key={item.id} title={`Question ${i + 1} · ${item.content.domain}`}>
              {item.content.passage && (
                <div className="prose-passage text-xs leading-6 text-text-muted">{item.content.passage}</div>
              )}
              <div className="mt-3 text-sm font-medium text-text-primary">
                <MessageContent content={item.content.prompt} />
              </div>
              {isNumeric ? (
                <div className="mt-3 text-sm">
                  <p className="text-text-secondary">
                    Your answer:{" "}
                    <span className={item.isCorrect ? "text-success" : "text-danger"}>
                      {item.numericAnswer ?? "--"}
                    </span>
                  </p>
                  {!item.isCorrect && (
                    <p className="text-text-secondary">
                      Correct answer: <span className="text-success">{item.content.correctValue}</span>
                    </p>
                  )}
                </div>
              ) : (
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
                        <MathText text={opt.text} />
                      </AnswerOption>
                    );
                  })}
                </div>
              )}
              {item.content.explanation && (
                <div className="mt-3 text-xs">
                  <MessageContent content={item.content.explanation} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/sat/mock-exam" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Mock Exam
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">SmartPrepAfrica SAT Practice Simulation — Results</h1>

      <div className="mt-6">
        <Card title="SmartPrepAfrica Estimated Score">
          <div className="text-3xl font-semibold text-text-primary">
            {attempt.overallScore ?? "--"}
            <span className="text-base font-normal text-text-muted"> / {SAT_CONFIG.scoreScale.compositeMax}</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Not an official College Board SAT score — a SmartPrepAfrica practice simulation.
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SatSectionScoreCard label={SAT_SECTION_LABELS.READING_WRITING} score={attempt.readingWritingScore} />
        <SatSectionScoreCard label={SAT_SECTION_LABELS.MATH} score={attempt.mathScore} />
      </div>

      <div className="mt-4 space-y-1 text-xs text-text-muted">
        {attempt.readingWritingModule2Tier && (
          <p>
            Reading and Writing: you received {TIER_LABEL[attempt.readingWritingModule2Tier] ?? "Module 2"} based
            on your Module 1 performance.
          </p>
        )}
        {attempt.mathModule2Tier && (
          <p>
            Math: you received {TIER_LABEL[attempt.mathModule2Tier] ?? "Module 2"} based on your Module 1
            performance.
          </p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-text-primary">Reading and Writing Review</h2>
        {renderModule(readingWritingItems, 1)}
        {renderModule(readingWritingItems, 2)}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-medium text-text-primary">Math Review</h2>
        {renderModule(mathItems, 1)}
        {renderModule(mathItems, 2)}
      </div>
    </div>
  );
}
