import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { AnswerOption } from "@/components/exam/answer-option";
import { MessageContent } from "@/components/ai-coach/message-content";
import { MathText } from "@/components/sat/math-text";
import { asOptions } from "@/lib/practice-types";
import { isSatEnabled, SAT_CONFIG } from "@/lib/sat/config";

export default async function SatMathResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.satAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.submittedAt) redirect(`/international-exams/sat/math/session/${attemptId}`);

  const correctCount = attempt.items.filter((i) => i.isCorrect).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/sat/math" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Math Practice
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Math Results</h1>

      <div className="mt-6">
        <Card title="SmartPrepAfrica Estimated Section Score">
          <div className="text-3xl font-semibold text-text-primary">
            {attempt.mathScore ?? "--"}
            <span className="text-base font-normal text-text-muted"> / {SAT_CONFIG.scoreScale.sectionMax}</span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {correctCount} of {attempt.items.length} correct
          </p>
        </Card>
      </div>

      <div className="mt-8 space-y-6">
        {attempt.items.map((item, i) => {
          const isNumeric = item.content.questionType === "STUDENT_PRODUCED_RESPONSE";
          const options = isNumeric ? [] : asOptions(item.content.options);
          return (
            <Card key={item.id} title={`Question ${i + 1}`}>
              <div className="text-sm font-medium text-text-primary">
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
    </div>
  );
}
