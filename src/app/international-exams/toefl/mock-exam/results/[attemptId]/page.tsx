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

type EvalItem = {
  evalStatus: string;
  evalScore: number | null;
  evalOrganization: number | null;
  evalClarity: number | null;
  evalFluency: number | null;
  evalPronunciation: number | null;
  evalGrammar: number | null;
  evalVocabulary: number | null;
  evalTaskCompletion: number | null;
  evalFeedback: string | null;
};

function EvalPanel({ item, skill }: { item: EvalItem; skill: "WRITING" | "SPEAKING" }) {
  if (item.evalStatus === "EVALUATED") {
    return (
      <>
        <div className="text-2xl font-semibold text-text-primary">{item.evalScore?.toFixed(1) ?? "--"} / 6</div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          {skill === "WRITING" ? (
            <>
              <div>
                <dt className="text-text-muted">Organization</dt>
                <dd className="text-text-primary">{item.evalOrganization ?? "--"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Clarity</dt>
                <dd className="text-text-primary">{item.evalClarity ?? "--"}</dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt className="text-text-muted">Fluency</dt>
                <dd className="text-text-primary">{item.evalFluency ?? "--"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Pronunciation</dt>
                <dd className="text-text-primary">{item.evalPronunciation ?? "--"}</dd>
              </div>
            </>
          )}
          <div>
            <dt className="text-text-muted">Grammar</dt>
            <dd className="text-text-primary">{item.evalGrammar ?? "--"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Vocabulary</dt>
            <dd className="text-text-primary">{item.evalVocabulary ?? "--"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Task completion</dt>
            <dd className="text-text-primary">{item.evalTaskCompletion ?? "--"}</dd>
          </div>
        </dl>
        {item.evalFeedback && <p className="mt-3 text-sm text-text-secondary">{item.evalFeedback}</p>}
      </>
    );
  }
  if (item.evalStatus === "UNAVAILABLE") {
    return <p className="text-sm text-text-secondary">AI evaluation is not currently available.</p>;
  }
  if (item.evalStatus === "FAILED") {
    return <p className="text-sm text-text-secondary">AI evaluation failed for this response. No score was recorded.</p>;
  }
  return <p className="text-sm text-text-secondary">Evaluation is still in progress.</p>;
}

export default async function ToeflMockExamResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { orderBy: { order: "asc" }, include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.submittedAt) redirect(`/international-exams/toefl/mock-exam/session/${attemptId}`);

  const mcqItems = attempt.items.filter((i) => i.content.skill === "READING" || i.content.skill === "LISTENING");
  const writingItems = attempt.items.filter((i) => i.content.skill === "WRITING");
  const speakingItems = attempt.items.filter((i) => i.content.skill === "SPEAKING");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/toefl/mock-exam" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Mock Exam
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Mock Exam Results</h1>

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

      {writingItems.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-medium text-text-primary">Writing</h2>
          {writingItems.map((item, i) => (
            <div key={item.id} className="space-y-4">
              <Card title={`Task ${i + 1} Prompt`}>
                <p className="text-sm text-text-secondary">{item.content.prompt}</p>
              </Card>
              <Card title={`Your Response (${item.writingWordCount ?? 0} words)`}>
                <p className="whitespace-pre-wrap text-sm text-text-primary">
                  {item.writingText || "(no response submitted)"}
                </p>
              </Card>
              <Card title="AI Evaluation">
                <EvalPanel item={item} skill="WRITING" />
              </Card>
            </div>
          ))}
        </div>
      )}

      {speakingItems.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-medium text-text-primary">Speaking</h2>
          {speakingItems.map((item, i) => (
            <div key={item.id} className="space-y-4">
              <Card title={`Task ${i + 1} Prompt`}>
                <p className="text-sm text-text-secondary">{item.content.prompt}</p>
              </Card>
              <Card title="Your Response">
                {item.speakingAudioUrl ? (
                  <AudioPlayer src={item.speakingAudioUrl} />
                ) : (
                  <p className="text-sm text-text-muted">No recording was saved.</p>
                )}
              </Card>
              <Card title="AI Evaluation">
                <EvalPanel item={item} skill="SPEAKING" />
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
