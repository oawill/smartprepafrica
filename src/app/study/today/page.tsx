import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";
import { awardXp } from "@/lib/gamification/xp-service";
import { weekStartFor, startOfDay, regenerateStudyPlan } from "@/lib/study-plan/regenerate";
import { dateKey } from "@/lib/study-plan/scheduler";
import { getStudyPlanView, getTodayItems, getCurrentActivity } from "@/lib/study-plan/view";
import { StudyPreferencesForm } from "@/app/study-plan/study-preferences-form";
import { ActivityCard } from "@/app/study/today/activity-card";

export default async function TodaysStudyPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=%2Fstudy%2Ftoday");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const userId = session.user.id;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { dailyStudyMinutes: true, studyDays: true, preferredStudyPeriod: true },
  });
  if (!profile) redirect("/onboarding");

  const hasPreferences = !!profile.dailyStudyMinutes && profile.studyDays.length > 0;

  if (!hasPreferences) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-h1 font-semibold text-text-primary">Create your personalized study plan</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Tell SmartPrepAfrica your subjects, goals, and available study time so we can build today&apos;s learning
          plan.
        </p>
        <div className="mt-6">
          <Card title="Create My Study Plan">
            <StudyPreferencesForm
              current={{
                dailyStudyMinutes: profile.dailyStudyMinutes,
                studyDays: profile.studyDays,
                preferredStudyPeriod: profile.preferredStudyPeriod,
              }}
            />
          </Card>
        </div>
      </div>
    );
  }

  const now = new Date();
  const today = startOfDay(now);
  const weekStart = weekStartFor(now);

  // Cheap after the ordering fix in regenerate.ts — the fingerprint
  // check still skips the expensive recompute, but the "flip past PENDING
  // to MISSED" bookkeeping now always runs, which is what surfaces
  // yesterday's missed activities below.
  await regenerateStudyPlan(userId, { reason: "DAILY_CHECK" });

  const view = await getStudyPlanView(userId, weekStart);

  if (!view) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-h1 font-semibold text-text-primary">Today&apos;s Study</h1>
        <p className="mt-2 text-sm text-text-secondary">
          We couldn&apos;t build a plan yet — pick at least one subject to get started.
        </p>
        <Link href="/study-plan" className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
          Choose My Subjects
        </Link>
      </div>
    );
  }

  const todayItems = getTodayItems(view, now);
  const missedItems = view.items.filter((i) => i.status === "MISSED");
  const currentActivity = getCurrentActivity(view, now);

  const completedToday = todayItems.filter((i) => i.status === "COMPLETED");
  const skippedToday = todayItems.filter((i) => i.status === "SKIPPED");
  const doneCount = completedToday.length + skippedToday.length;
  const totalMinutesToday = todayItems.reduce((sum, i) => sum + i.recommendedMinutes, 0);
  const completedMinutesToday = completedToday.reduce((sum, i) => sum + i.recommendedMinutes, 0);
  const allDone = todayItems.length > 0 && doneCount === todayItems.length;

  const progressDots = todayItems.map((i) => (i.status === "COMPLETED" || i.status === "SKIPPED" ? "●" : "○")).join(" ");

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard/student" className="text-sm text-text-secondary hover:text-text-primary">
          ← Back
        </Link>
        <Link href="/study-plan" className="text-xs text-text-muted hover:text-text-secondary">
          Today&apos;s progress
        </Link>
      </div>

      <h1 className="mt-3 text-h1 font-semibold text-text-primary">Today&apos;s Study</h1>

      {todayItems.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-text-secondary">
            {progressDots} · {doneCount} of {todayItems.length} completed
          </p>
          {completedMinutesToday > 0 && (
            <p className="mt-0.5 text-xs text-text-muted">
              {completedMinutesToday} of {totalMinutesToday} minutes completed
            </p>
          )}
        </div>
      )}

      {missedItems.length > 0 && !allDone && (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning-surface p-4">
          <p className="text-sm font-medium text-text-primary">Welcome back</p>
          <p className="mt-1 text-sm text-text-secondary">
            You missed {missedItems.length} {missedItems.length === 1 ? "activity" : "activities"} earlier. We&apos;ve
            adjusted today&apos;s plan to keep things manageable.
          </p>
          <div className="mt-2 flex gap-2">
            <Link href="/study-plan" className="rounded-full border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-brand">
              Review Missed Activities
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6">
        {todayItems.length === 0 ? (
          <EmptyDay />
        ) : allDone ? (
          <CompletionScreen userId={userId} today={today} completedToday={completedToday} skippedToday={skippedToday} view={view} />
        ) : currentActivity ? (
          <ActivityCard item={currentActivity} />
        ) : (
          <EmptyDay />
        )}
      </div>
    </div>
  );
}

function EmptyDay() {
  return (
    <Card title="Nothing scheduled today">
      <p className="text-sm text-text-secondary">Take a break, or choose something optional to study.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link href="/practice" className="rounded-lg border border-border-strong px-4 py-2.5 text-center text-sm text-text-primary hover:border-brand">
          Quick Drill
        </Link>
        <Link href="/learn" className="rounded-lg border border-border-strong px-4 py-2.5 text-center text-sm text-text-primary hover:border-brand">
          Explore Lessons
        </Link>
      </div>
      <div className="mt-2">
        <AiCoachPanel context={{}} defaultMode="ASK" triggerLabel="Ask AI Coach" triggerClassName="w-full rounded-lg border border-border-strong px-4 py-2.5 text-center text-sm text-text-primary hover:border-brand" />
      </div>
    </Card>
  );
}

async function CompletionScreen({
  userId,
  today,
  completedToday,
  skippedToday,
  view,
}: {
  userId: string;
  today: Date;
  completedToday: ReturnType<typeof getTodayItems>;
  skippedToday: ReturnType<typeof getTodayItems>;
  view: NonNullable<Awaited<ReturnType<typeof getStudyPlanView>>>;
}) {
  // Idempotent — same [userId, type, sourceId] pattern as every other XP
  // award, so re-visiting this page after the day is already complete
  // never double-awards. This is also what bumps the study streak, via
  // awardXp's existing computeStreakUpdate call — no new streak logic.
  await awardXp(userId, "DAILY_PLAN_COMPLETE", `daily-${dateKey(today)}`);

  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const tomorrowItems = (view.itemsByDate.get(dateKey(tomorrow)) ?? []).slice(0, 1);

  const [attemptsToday, lessonsCompletedToday] = await Promise.all([
    prisma.examAttempt.findMany({
      where: { userId, submittedAt: { gte: today } },
      select: { totalItems: true },
    }),
    prisma.lessonProgress.count({ where: { enrollment: { userId }, completedAt: { gte: today } } }),
  ]);
  const practiceQuestionsToday = attemptsToday.reduce((sum, a) => sum + a.totalItems, 0);
  const coachSessionsToday = completedToday.filter((i) => i.activityType === "AI_COACH_SESSION").length;
  const totalMinutesToday = completedToday.reduce((sum, i) => sum + i.recommendedMinutes, 0);

  const byType: Record<string, number> = {};
  for (const i of completedToday) byType[i.activityType] = (byType[i.activityType] ?? 0) + 1;

  return (
    <Card title="Today's Study Complete 🎉">
      <p className="text-sm text-text-secondary">You completed:</p>
      <ul className="mt-2 space-y-1 text-sm text-text-primary">
        <li>{completedToday.length} study {completedToday.length === 1 ? "activity" : "activities"}</li>
        {practiceQuestionsToday > 0 && <li>{practiceQuestionsToday} practice questions</li>}
        {(byType.LESSON ?? 0) > 0 && <li>{byType.LESSON} lesson{byType.LESSON === 1 ? "" : "s"}</li>}
        {coachSessionsToday > 0 && <li>{coachSessionsToday} AI Coach session{coachSessionsToday === 1 ? "" : "s"}</li>}
        {skippedToday.length > 0 && <li className="text-text-muted">{skippedToday.length} skipped</li>}
      </ul>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-text-muted">Today&apos;s study time</p>
      <p className="text-lg font-semibold text-brand-text">
        {Math.floor(totalMinutesToday / 60)}h {totalMinutesToday % 60}m
      </p>

      {tomorrowItems.length > 0 && (
        <div className="mt-5 rounded-lg border border-border bg-surface p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Tomorrow&apos;s focus</p>
          <p className="mt-1 text-sm font-medium text-text-primary">{tomorrowItems[0].subjectName}</p>
          <p className="text-xs text-text-secondary">{tomorrowItems[0].topic}</p>
          <Link href="/study-plan" className="mt-2 inline-block text-xs text-brand-text hover:underline">
            View Tomorrow
          </Link>
        </div>
      )}

      <p className="mt-5 text-xs font-medium uppercase tracking-wide text-text-muted">Study more (optional)</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <Link href="/practice" className="rounded-lg border border-border-strong px-3 py-2 text-center text-xs text-text-secondary hover:border-brand">
          Quick Drill
        </Link>
        <Link href="/learn" className="rounded-lg border border-border-strong px-3 py-2 text-center text-xs text-text-secondary hover:border-brand">
          Explore Lessons
        </Link>
        <div>
          <AiCoachPanel context={{}} defaultMode="ASK" triggerLabel="Ask AI Coach" triggerClassName="w-full rounded-lg border border-border-strong px-3 py-2 text-center text-xs text-text-secondary hover:border-brand" />
        </div>
      </div>
    </Card>
  );
}
