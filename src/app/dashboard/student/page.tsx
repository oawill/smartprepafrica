import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { redeemVoucher } from "@/app/dashboard/student/actions";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";
import { getTodaysRecommendation, getExamReadiness } from "@/lib/ai/mastery-service";

export default async function StudentDashboard({
  searchParams,
}: PageProps<"/dashboard/student">) {
  const { payment } = await searchParams;
  const session = await auth();
  if (!session) return null;
  const userId = session.user.id;

  const [attempts, coursesInProgress, certificatesEarned, wrongResponses, recommendation, readiness] =
    await Promise.all([
      prisma.examAttempt.findMany({
        where: { userId, submittedAt: { not: null } },
        select: { score: true },
        orderBy: { submittedAt: "desc" },
        take: 10,
      }),
      prisma.courseEnrollment.count({
        where: { userId, status: "ACTIVE" },
      }),
      prisma.certificate.count({ where: { userId } }),
      prisma.questionResponse.findMany({
        where: { isCorrect: false, attempt: { userId } },
        select: { question: { select: { topic: true } } },
        take: 200,
      }),
      getTodaysRecommendation(userId),
      getExamReadiness(userId),
    ]);

  const readinessScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / attempts.length
        )
      : null;

  const topicCounts = new Map<string, number>();
  for (const r of wrongResponses) {
    const topic = r.question.topic;
    if (!topic) continue;
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  }
  const weakTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back, {session.user.name?.split(" ")[0] ?? "there"}.
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Here&apos;s where your prep and learning progress will live.
          </p>
        </div>
        <AiCoachPanel
          context={{}}
          suggestedPrompts={[
            "What should I study today?",
            "What am I weak at?",
            "Quiz me",
            "Check my exam readiness",
          ]}
        />
      </div>

      {payment === "success" && (
        <p className="mt-4 rounded-lg border border-success/40 bg-success-surface px-4 py-2 text-sm text-success">
          Payment successful — your subscription is now active.
        </p>
      )}

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-brand-text">
        SmartPrepAfrica Prep
      </h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Readiness score">
          <p className="text-3xl font-semibold">
            {readinessScore !== null ? `${readinessScore}%` : "—"}
          </p>
        </Card>
        <Card title="Study streak">
          <p className="text-3xl font-semibold">0 days</p>
        </Card>
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-success">
        SmartPrepAfrica Learning
      </h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Courses in progress">
          <p className="text-3xl font-semibold">{coursesInProgress}</p>
        </Card>
        <Link href="/dashboard/student/certificates">
          <Card title="Certificates earned">
            <p className="text-3xl font-semibold">{certificatesEarned}</p>
          </Card>
        </Link>
      </div>

      {recommendation && (
        <div className="mt-6">
          <Card title="Your AI Study Coach">
            <p className="text-xs uppercase tracking-wide text-brand-text">Recommended for today</p>
            <p className="mt-1 text-lg font-medium text-text-primary">{recommendation.topic}</p>
            <p className="text-xs text-text-muted">{recommendation.subjectName}</p>
            <p className="mt-2 text-sm text-text-secondary">
              Current mastery: {recommendation.masteryScore}%
            </p>
            {recommendation.nextTopic && (
              <p className="mt-1 text-sm text-text-secondary">
                Next, review: <span className="text-text-secondary">{recommendation.nextTopic}</span>
              </p>
            )}
            {recommendation.lesson && (
              <Link
                href={`/educom/${recommendation.lesson.courseId}/lessons/${recommendation.lesson.id}`}
                className="mt-3 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Continue Learning
              </Link>
            )}
          </Card>
        </div>
      )}

      {readiness.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {readiness.map((r) => (
            <Card key={r.subjectName} title={`${r.subjectName} Readiness`}>
              <p className="text-3xl font-semibold text-brand-text">{r.readinessPct}% Ready</p>
              {r.strongTopics.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-success">Strong</p>
                  <p className="text-sm text-text-secondary">{r.strongTopics.join(", ")}</p>
                </div>
              )}
              {r.weakTopics.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-warning">Needs improvement</p>
                  <p className="text-sm text-text-secondary">{r.weakTopics.join(", ")}</p>
                </div>
              )}
              {r.recommendedStudyMinutes > 0 && (
                <p className="mt-3 text-xs text-text-muted">
                  Recommended study time: {Math.floor(r.recommendedStudyMinutes / 60)}h{" "}
                  {r.recommendedStudyMinutes % 60}min
                </p>
              )}
              <p className="mt-2 text-[11px] text-text-muted">
                Estimated from your practice history — not a guarantee of exam results.
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Weak topics">
          {weakTopics.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Complete a mock exam or Study Drill to see your weak topics
              here.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {weakTopics.map(([topic, count]) => (
                <li key={topic} className="flex justify-between text-text-secondary">
                  <span>{topic}</span>
                  <span className="text-text-muted">{count} missed</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recommended next">
          <div className="space-y-2 text-sm">
            <Link
              href="/practice"
              className="block text-brand-text hover:underline"
            >
              Take a practice session →
            </Link>
            <Link
              href="/educom"
              className="block text-brand-text hover:underline"
            >
              Browse courses →
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Have a sponsor voucher code?">
          <form action={redeemVoucher} className="flex gap-2">
            <input
              type="text"
              name="code"
              placeholder="SP-XXXXXXXX"
              required
              className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm uppercase outline-none placeholder:text-text-muted focus:border-brand"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Redeem
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
