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
import { SatAskAi } from "@/components/sat/sat-ask-ai";

export default async function SatDiagnosticResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.satAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.submittedAt) redirect(`/international-exams/sat/diagnostic/session/${attemptId}`);

  const readingWritingItems = attempt.items.filter((i) => i.content.section === "READING_WRITING");
  const mathItems = attempt.items.filter((i) => i.content.section === "MATH");

  const domainStats = new Map<string, { correct: number; total: number }>();
  for (const item of attempt.items) {
    if (item.isCorrect === null) continue;
    const stat = domainStats.get(item.content.domain) ?? { correct: 0, total: 0 };
    stat.total += 1;
    if (item.isCorrect) stat.correct += 1;
    domainStats.set(item.content.domain, stat);
  }
  const domainRates = [...domainStats.entries()].map(([domain, s]) => ({ domain, rate: s.correct / s.total }));
  const strongestDomain = domainRates.length
    ? domainRates.reduce((a, b) => (b.rate > a.rate ? b : a)).domain
    : null;
  const weakestDomain = domainRates.length
    ? domainRates.reduce((a, b) => (b.rate < a.rate ? b : a)).domain
    : null;

  function renderItem(item: (typeof readingWritingItems)[number], i: number) {
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
              <span className={item.isCorrect ? "text-success" : "text-danger"}>{item.numericAnswer ?? "--"}</span>
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
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/sat/diagnostic" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Diagnostic Test
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Diagnostic Results</h1>

      <div className="mt-6">
        <Card title="SmartPrepAfrica Estimated SAT Readiness Score">
          <div className="text-3xl font-semibold text-text-primary">
            {attempt.overallScore ?? "--"}
            <span className="text-base font-normal text-text-muted"> / {SAT_CONFIG.scoreScale.compositeMax}</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Not an official College Board SAT score — SmartPrepAfrica&apos;s own estimate from this diagnostic.
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SatSectionScoreCard label={SAT_SECTION_LABELS.READING_WRITING} score={attempt.readingWritingScore} />
        <SatSectionScoreCard label={SAT_SECTION_LABELS.MATH} score={attempt.mathScore} />
      </div>

      {(strongestDomain || weakestDomain) && (
        <div className="mt-6">
          <Card title="Strengths and Weaknesses">
            <p className="text-sm text-text-secondary">
              Strongest skill: <span className="text-text-primary">{strongestDomain ?? "--"}</span>
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Weakest skill: <span className="text-text-primary">{weakestDomain ?? "--"}</span>
            </p>
          </Card>
        </div>
      )}

      {readingWritingItems.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-medium text-text-primary">Reading and Writing Review</h2>
          {readingWritingItems.map((item, i) => renderItem(item, i))}
        </div>
      )}

      {mathItems.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-medium text-text-primary">Math Review</h2>
          {mathItems.map((item, i) => renderItem(item, i))}
        </div>
      )}
    </div>
  );
}
