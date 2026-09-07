import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { AnswerOption } from "@/components/exam/answer-option";
import { AudioPlayer } from "@/components/toefl/audio-player";
import { asOptions } from "@/lib/practice-types";
import { isToeflEnabled, TOEFL_CONFIG } from "@/lib/toefl/config";

export default async function ToeflListeningResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const { attemptId } = await params;
  const session = await requireStudentSession(`/international-exams/toefl/listening/results/${attemptId}`);
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.submittedAt) redirect(`/international-exams/toefl/listening/session/${attemptId}`);

  const correctCount = attempt.items.filter((i) => i.isCorrect).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/toefl/listening" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Listening Practice
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Listening Results</h1>

      <div className="mt-6">
        <Card title="Listening Score">
          <div className="text-3xl font-semibold text-text-primary">
            {attempt.listeningScore?.toFixed(1) ?? "--"}
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
              {item.content.audioUrl && <AudioPlayer src={item.content.audioUrl} />}
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
              {item.content.transcript && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-brand-text">Show transcript</summary>
                  <p className="mt-2 text-xs leading-6 text-text-muted">{item.content.transcript}</p>
                </details>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
