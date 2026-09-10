import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { NotificationsCard } from "@/components/dashboard/notifications-card";
import { redeemVoucher } from "@/app/dashboard/student/actions";
import { approveParentLink, rejectParentLink } from "@/app/dashboard/student/parent-link-actions";
import { acceptSchoolInvitation, declineSchoolInvitation } from "@/app/dashboard/school/invitation-actions";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";
import { getTodaysRecommendation, getExamReadiness } from "@/lib/ai/mastery-service";
import { getExamReadiness as getExamScopedReadiness } from "@/lib/practice/readiness-service";
import { DashboardReadinessCard } from "@/components/readiness/dashboard-readiness-card";
import { getOrCreateLinkCode } from "@/lib/parent-links";
import { BADGE_CATALOG } from "@/lib/gamification/badges";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function StudentDashboard({
  searchParams,
}: PageProps<"/dashboard/student">) {
  const { payment } = await searchParams;
  const session = await auth();
  if (!session) return null;
  const userId = session.user.id;
  const locale = await getLocale();
  const t = getDictionary(locale).studentDashboard;

  const [attempts, coursesInProgress, certificatesEarned, wrongResponses, recommendation, readiness, studentProfile, badgesEarned] =
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
      prisma.studentProfile.findUnique({
        where: { userId },
        select: { id: true, targetExams: true, xp: true, currentStreakDays: true },
      }),
      prisma.userBadge.count({ where: { userId } }),
    ]);

  // Which exams to show the compact Readiness widget for — the student's
  // registered targetExams, falling back to exams they've actually
  // attempted if none are registered (never an empty/unrelated guess).
  const widgetExams =
    studentProfile?.targetExams && studentProfile.targetExams.length > 0
      ? studentProfile.targetExams
      : (
          await prisma.examAttempt.findMany({
            where: { userId },
            distinct: ["exam"],
            select: { exam: true },
            take: 4,
          })
        ).map((a) => a.exam);
  const examReadinessCards = await Promise.all(
    widgetExams.map(async (exam) => ({ exam, readiness: await getExamScopedReadiness(userId, exam) }))
  );

  const [linkCode, pendingParentRequests] = studentProfile
    ? await Promise.all([
        getOrCreateLinkCode(studentProfile.id),
        prisma.parentStudentLink.findMany({
          where: { studentId: studentProfile.id, status: "PENDING" },
          include: { parent: { select: { name: true, email: true } } },
          orderBy: { requestedAt: "desc" },
        }),
      ])
    : [null, []];

  const pendingSchoolInvitations = session.user.email
    ? await prisma.schoolInvitation.findMany({
        where: {
          inviteeEmail: session.user.email.toLowerCase(),
          role: "STUDENT",
          status: "PENDING",
          invitationExpiresAt: { gt: new Date() },
        },
        include: { school: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const notifications = await prisma.notification.findMany({
    where: { userId, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

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
            {t.welcomeBack(session.user.name?.split(" ")[0] ?? "there")}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{t.dashboardSubtitle}</p>
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
          {t.paymentSuccessful}
        </p>
      )}

      <NotificationsCard notifications={notifications} path="/dashboard/student" />

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-brand-text">
        {t.prepSectionTitle}
      </h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title={t.readinessScore}>
          <p className="text-3xl font-semibold">
            {readinessScore !== null ? `${readinessScore}%` : "—"}
          </p>
        </Card>
        <Card title={t.studyStreak}>
          <p className="text-3xl font-semibold">{t.daysLabel(studentProfile?.currentStreakDays ?? 0)}</p>
        </Card>
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {t.achievementsSectionTitle}
      </h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title={t.xp}>
          <p className="text-3xl font-semibold">{studentProfile?.xp ?? 0}</p>
          <p className="mt-1 text-xs text-text-muted">
            {t.levelLabel(Math.floor((studentProfile?.xp ?? 0) / 100) + 1)}
          </p>
        </Card>
        <Link href="/dashboard/student/badges">
          <Card title={t.badgesEarned}>
            <p className="text-3xl font-semibold">
              {badgesEarned} / {BADGE_CATALOG.length}
            </p>
          </Card>
        </Link>
        <Link href="/dashboard/student/leaderboard">
          <Card title={t.leaderboard}>
            <p className="text-sm text-brand-text">{t.viewSchoolLeaderboard}</p>
          </Card>
        </Link>
      </div>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-success">
        {t.learningSectionTitle}
      </h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title={t.coursesInProgress}>
          <p className="text-3xl font-semibold">{coursesInProgress}</p>
        </Card>
        <Link href="/dashboard/student/certificates">
          <Card title={t.certificatesEarned}>
            <p className="text-3xl font-semibold">{certificatesEarned}</p>
          </Card>
        </Link>
      </div>

      {recommendation && (
        <div className="mt-6">
          <Card title={t.yourAiStudyCoach}>
            <p className="text-xs uppercase tracking-wide text-brand-text">{t.recommendedForToday}</p>
            <p className="mt-1 text-lg font-medium text-text-primary">{recommendation.topic}</p>
            <p className="text-xs text-text-muted">{recommendation.subjectName}</p>
            <p className="mt-2 text-sm text-text-secondary">{t.currentMastery(recommendation.masteryScore)}</p>
            {recommendation.nextTopic && (
              <p className="mt-1 text-sm text-text-secondary">
                {t.nextReview} <span className="text-text-secondary">{recommendation.nextTopic}</span>
              </p>
            )}
            {recommendation.lesson && (
              <Link
                href={`/learn/${recommendation.lesson.courseId}/lessons/${recommendation.lesson.id}`}
                className="mt-3 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                {t.continueLearning}
              </Link>
            )}
          </Card>
        </div>
      )}

      {examReadinessCards.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {examReadinessCards.map(({ exam, readiness: examReadiness }) => (
            <DashboardReadinessCard key={exam} exam={exam} readiness={examReadiness} />
          ))}
        </div>
      )}

      {readiness.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {readiness.map((r) => (
            <Card key={r.subjectName} title={t.readinessNamedTitle(r.subjectName)}>
              <p className="text-3xl font-semibold text-brand-text">{t.readyPct(r.readinessPct)}</p>
              {r.strongTopics.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-success">{t.strong}</p>
                  <p className="text-sm text-text-secondary">{r.strongTopics.join(", ")}</p>
                </div>
              )}
              {r.weakTopics.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-warning">{t.needsImprovement}</p>
                  <p className="text-sm text-text-secondary">{r.weakTopics.join(", ")}</p>
                </div>
              )}
              {r.recommendedStudyMinutes > 0 && (
                <p className="mt-3 text-xs text-text-muted">
                  {t.recommendedStudyTime(
                    Math.floor(r.recommendedStudyMinutes / 60),
                    r.recommendedStudyMinutes % 60
                  )}
                </p>
              )}
              <p className="mt-2 text-[11px] text-text-muted">{t.estimateDisclaimer}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title={t.weakTopics}>
          {weakTopics.length === 0 ? (
            <p className="text-sm text-text-secondary">{t.noWeakTopicsYet}</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {weakTopics.map(([topic, count]) => (
                <li key={topic} className="flex justify-between text-text-secondary">
                  <span>{topic}</span>
                  <span className="text-text-muted">{t.missedCount(count)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={t.recommendedNext}>
          <div className="space-y-2 text-sm">
            <Link
              href="/practice"
              className="block text-brand-text hover:underline"
            >
              {t.takePracticeSession}
            </Link>
            <Link
              href="/learn"
              className="block text-brand-text hover:underline"
            >
              {t.browseCourses}
            </Link>
          </div>
        </Card>
      </div>

      {pendingParentRequests.length > 0 && (
        <div className="mt-6">
          <Card title={t.parentGuardianRequests}>
            <ul className="space-y-3">
              {pendingParentRequests.map((req) => (
                <li key={req.id} className="rounded-lg border border-border bg-surface-sunken p-3">
                  <p className="text-sm text-text-primary">
                    <span className="font-medium">{req.parent.name}</span>
                    {req.relationship ? t.relationshipSuffix(req.relationship) : ""} {t.wantsToConnectAsParent}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">{req.parent.email}</p>
                  <div className="mt-2 flex gap-2">
                    <form action={approveParentLink}>
                      <input type="hidden" name="linkId" value={req.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover"
                      >
                        {t.approve}
                      </button>
                    </form>
                    <form action={rejectParentLink}>
                      <input type="hidden" name="linkId" value={req.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-danger/40 hover:text-danger"
                      >
                        {t.reject}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {pendingSchoolInvitations.length > 0 && (
        <div className="mt-6">
          <Card title={t.schoolInvitations}>
            <ul className="space-y-3">
              {pendingSchoolInvitations.map((inv) => (
                <li key={inv.id} className="rounded-lg border border-border bg-surface-sunken p-3">
                  <p className="text-sm text-text-primary">
                    <span className="font-medium">{inv.school.name}</span> {t.wantsToAddAsStudent}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <form action={acceptSchoolInvitation}>
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover"
                      >
                        {t.accept}
                      </button>
                    </form>
                    <form action={declineSchoolInvitation}>
                      <input type="hidden" name="invitationId" value={inv.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-danger/40 hover:text-danger"
                      >
                        {t.decline}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title={t.haveVoucherCode}>
          <form action={redeemVoucher} className="flex gap-2">
            <input
              type="text"
              name="code"
              placeholder={t.voucherPlaceholder}
              required
              className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm uppercase outline-none placeholder:text-text-muted focus:border-brand"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              {t.redeem}
            </button>
          </form>
        </Card>

        {linkCode && (
          <Card title={t.yourParentLinkCode}>
            <p className="text-sm text-text-secondary">{t.shareParentLinkCode}</p>
            <p className="mt-3 rounded-lg border border-border-strong bg-surface-sunken px-4 py-3 text-center font-mono text-lg font-semibold tracking-wide text-brand-text">
              {linkCode}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
