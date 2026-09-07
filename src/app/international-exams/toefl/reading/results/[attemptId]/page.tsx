import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { AnswerOption } from "@/components/exam/answer-option";
import { asOptions } from "@/lib/practice-types";
import { isToeflEnabled } from "@/lib/toefl/config";
import { TOEFL_CONFIG } from "@/lib/toefl/config";

export default async function ToeflReadingResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const { attemptId } = await params;
  const session = await requireStudentSession(`/international-exams/toefl/reading/results/${attemptId}`);
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.submittedAt) redirect(`/international-exams/toefl/reading/session/${attemptId}`);

  const correctCount = attempt.items.filter((i) => i.isCorrect).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/toefl/reading" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Reading Practice
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Reading Results</h1>

      <div className="mt-6">
        <Card title="Reading Score">
          <div className="text-3xl font-semibold text-text-primary">
            {attempt.readingScore?.toFixed(1) ?? "--"}
            <span className="text-base font-normal text-text-muted"> / {TOEFL_CONFIG.scoreScale.max}</span>
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
              <div className="prose-passage text-xs leading-6 text-text-muted">{item.content.passage}</div>
              <p className="mt-3 text-sm font-medium text-text-primary">{item.content.prompt}</p>
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
