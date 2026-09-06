import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { AnswerOption } from "@/components/exam/answer-option";
import { AudioPlayer } from "@/components/toefl/audio-player";
import { SkillReadinessCard } from "@/components/toefl/skill-readiness-card";
import { asOptions } from "@/lib/practice-types";
import { isToeflEnabled, TOEFL_CONFIG } from "@/lib/toefl/config";

function EvalPanel({ evalStatus }: { evalStatus: string }) {
  if (evalStatus === "EVALUATED") {
    // Not reached today — no evaluator exists yet (Step 13). Kept as an
    // honest fallback label instead of silently showing nothing.
    return <p className="text-sm text-text-secondary">Evaluation is available above.</p>;
  }
  if (evalStatus === "UNAVAILABLE") {
    return <p className="text-sm text-text-secondary">AI evaluation is not currently available.</p>;
  }
  return <p className="text-sm text-text-secondary">Evaluation is still in progress.</p>;
}

export default async function ToeflDiagnosticResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.submittedAt) redirect(`/international-exams/toefl/diagnostic/session/${attemptId}`);

  const mcqItems = attempt.items.filter((i) => i.content.skill === "READING" || i.content.skill === "LISTENING");
  const writingItem = attempt.items.find((i) => i.content.skill === "WRITING");
  const speakingItem = attempt.items.find((i) => i.content.skill === "SPEAKING");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/toefl/diagnostic" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Diagnostic Test
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Diagnostic Results</h1>

      <div className="mt-6">
        <Card title="Estimated SmartPrepAfrica Readiness Score">
          <div className="text-3xl font-semibold text-text-primary">
            {attempt.overallScore?.toFixed(1) ?? "--"}
            <span className="text-base font-normal text-text-muted"> / {TOEFL_CONFIG.scoreScale.max}</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Based on your Reading and Listening performance. Writing and Speaking are shown below for
            review but aren&apos;t included in this estimate — AI evaluation for those two skills isn&apos;t
            available yet.
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SkillReadinessCard label="Reading" score={attempt.readingScore} />
        <SkillReadinessCard label="Listening" score={attempt.listeningScore} />
      </div>

      {mcqItems.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-lg font-medium text-text-primary">Reading &amp; Listening Review</h2>
          {mcqItems.map((item, i) => {
            const options = asOptions(item.content.options);
            return (
              <Card key={item.id} title={`Question ${i + 1}`}>
                {item.content.passage ? (
                  <div className="prose-passage text-xs leading-6 text-text-muted">{item.content.passage}</div>
                ) : item.content.audioUrl ? (
                  <AudioPlayer src={item.content.audioUrl} />
                ) : null}
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
      )}

      {writingItem && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-medium text-text-primary">Writing</h2>
          <Card title="Prompt">
            <p className="text-sm text-text-secondary">{writingItem.content.prompt}</p>
          </Card>
          <Card title={`Your Response (${writingItem.writingWordCount ?? 0} words)`}>
            <p className="whitespace-pre-wrap text-sm text-text-primary">
              {writingItem.writingText || "(no response submitted)"}
            </p>
          </Card>
          <Card title="AI Evaluation">
            <EvalPanel evalStatus={writingItem.evalStatus} />
          </Card>
        </div>
      )}

      {speakingItem && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-medium text-text-primary">Speaking</h2>
          <Card title="Prompt">
            <p className="text-sm text-text-secondary">{speakingItem.content.prompt}</p>
          </Card>
          <Card title="Your Response">
            {speakingItem.speakingAudioUrl ? (
              <AudioPlayer src={speakingItem.speakingAudioUrl} />
            ) : (
              <p className="text-sm text-text-muted">No recording was saved.</p>
            )}
          </Card>
          <Card title="AI Evaluation">
            <EvalPanel evalStatus={speakingItem.evalStatus} />
          </Card>
        </div>
      )}
    </div>
  );
}
