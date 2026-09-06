import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { isToeflEnabled } from "@/lib/toefl/config";

export default async function ToeflWritingResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    include: { items: { include: { content: true } } },
  });
  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (!attempt.submittedAt) redirect(`/international-exams/toefl/writing/session/${attemptId}`);

  const item = attempt.items[0];
  if (!item) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/international-exams/toefl/writing" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Writing Practice
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Writing Results</h1>

      <div className="mt-6">
        <Card title="Prompt">
          <p className="text-sm text-text-secondary">{item.content.prompt}</p>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`Your Response (${item.writingWordCount ?? 0} words)`}>
          <p className="whitespace-pre-wrap text-sm text-text-primary">{item.writingText || "(no response submitted)"}</p>
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
                <dt className="text-text-muted">Organization</dt>
                <dd className="text-text-primary">{item.evalOrganization ?? "--"}</dd>
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
                <dt className="text-text-muted">Clarity</dt>
                <dd className="text-text-primary">{item.evalClarity ?? "--"}</dd>
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
