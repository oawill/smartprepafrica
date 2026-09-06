import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { AudioPlayer } from "@/components/toefl/audio-player";
import { isToeflEnabled } from "@/lib/toefl/config";

export default async function ToeflSpeakingResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.submittedAt) redirect(`/international-exams/toefl/speaking/session/${attemptId}`);

  const item = attempt.items[0];
  if (!item) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/toefl/speaking" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Speaking Practice
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Speaking Results</h1>

      <div className="mt-6">
        <Card title="Prompt">
          <p className="text-sm text-text-secondary">{item.content.prompt}</p>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Your Response">
          {item.speakingAudioUrl ? (
            <AudioPlayer src={item.speakingAudioUrl} />
          ) : (
            <p className="text-sm text-text-muted">No recording was saved.</p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        {item.evalStatus === "UNAVAILABLE" ? (
          <Card title="AI Evaluation">
            <p className="text-sm text-text-secondary">AI evaluation is not currently available.</p>
          </Card>
        ) : item.evalStatus === "EVALUATED" ? (
          <Card title="AI Evaluation">
            <div className="text-2xl font-semibold text-text-primary">{item.evalScore?.toFixed(1) ?? "--"} / 6</div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-text-muted">Fluency</dt>
                <dd className="text-text-primary">{item.evalFluency ?? "--"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Pronunciation</dt>
                <dd className="text-text-primary">{item.evalPronunciation ?? "--"}</dd>
              </div>
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
          </Card>
        ) : item.evalStatus === "FAILED" ? (
          <Card title="AI Evaluation">
            <p className="text-sm text-text-secondary">AI evaluation failed for this response. No score was recorded.</p>
          </Card>
        ) : (
          <Card title="AI Evaluation">
            <p className="text-sm text-text-secondary">Evaluation is still in progress.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
