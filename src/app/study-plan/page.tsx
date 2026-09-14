import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { examLabels } from "@/lib/exam-slugs";
import { weekStartFor, startOfDay } from "@/lib/study-plan/regenerate";
import { dateKey } from "@/lib/study-plan/scheduler";
import { getStudyPlanView, getMissedItems, ACTIVITY_TYPE_LABELS } from "@/lib/study-plan/view";
import { StudyPreferencesForm } from "@/app/study-plan/study-preferences-form";
import { DayCard } from "@/app/study-plan/day-card";
import { MissedItemBanner } from "@/app/study-plan/missed-item-banner";
import { ExamCountdown } from "@/app/study-plan/exam-countdown";
import { regenerateMyStudyPlan, togglePauseStudyPlan, updateStudyPlanSubjectsAction } from "@/app/study-plan/actions";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function StudyPlanPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=%2Fstudy-plan");
  if (session.user.role !== "STUDENT") redirect("/dashboard");

  const userId = session.user.id;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: {
      dailyStudyMinutes: true,
      studyDays: true,
      preferredStudyPeriod: true,
      onboardingCompleted: true,
      targetExams: true,
      targetSubjects: { select: { id: true, name: true } },
    },
  });

  if (!profile) redirect("/onboarding");

  const hasPreferences = !!profile.dailyStudyMinutes && profile.studyDays.length > 0;

  if (!hasPreferences) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-h1 font-semibold text-text-primary">Build your personalized study plan</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Tell us your subjects, study goals, and available study time so SmartPrepAfrica can create your weekly
          study plan.
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
  const weekStart = weekStartFor(now);
  const view = await getStudyPlanView(userId, weekStart);

  const [allSubjects, examProfiles] = await Promise.all([
    prisma.subject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    profile.targetExams.length > 0
      ? prisma.studentExamProfile.findMany({
          where: { userId, exam: { in: profile.targetExams } },
          select: { exam: true, examDate: true },
        })
      : Promise.resolve([]),
  ]);

  const missedItems = view ? getMissedItems(view) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-text-primary">Your Weekly Study Plan</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Built from your track, subjects, target exams, and recent performance — adapts as you study.
          </p>
        </div>
        <Link
          href="/dashboard/student"
          className="shrink-0 rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted"
        >
          ← Dashboard
        </Link>
      </div>

      {examProfiles.some((e) => e.examDate) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {examProfiles
            .filter((e) => e.examDate)
            .map((e) => (
              <ExamCountdown key={e.exam} exam={e.exam} examLabel={examLabels[e.exam]} examDate={e.examDate!} />
            ))}
        </div>
      )}

      {missedItems.length > 0 && (
        <div className="mt-6 space-y-2">
          {missedItems.map((item) => (
            <MissedItemBanner key={item.id} item={item} />
          ))}
        </div>
      )}

      {view && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card title="Total planned this week">
            <p className="text-2xl font-semibold text-text-primary">
              {Math.floor(view.totalPlannedMinutes / 60)}h {view.totalPlannedMinutes % 60}m
            </p>
          </Card>
          <Card title="Completed">
            <p className="text-2xl font-semibold text-brand-text">
              {Math.floor(view.completedMinutes / 60)}h {view.completedMinutes % 60}m
            </p>
          </Card>
          <Card title="Weekly completion">
            <p className="text-2xl font-semibold text-text-primary">{view.weeklyCompletionPct}%</p>
          </Card>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <form action={regenerateMyStudyPlan}>
          <button
            type="submit"
            className="rounded-full border border-border-strong px-4 py-2 text-xs font-medium text-text-secondary hover:border-brand"
          >
            Regenerate My Study Plan
          </button>
        </form>
        {view && (
          <form action={togglePauseStudyPlan}>
            <input type="hidden" name="weekStart" value={weekStart.toISOString()} />
            <input type="hidden" name="pause" value={String(view.status !== "PAUSED")} />
            <button
              type="submit"
              className="rounded-full border border-border-strong px-4 py-2 text-xs font-medium text-text-secondary hover:border-brand"
            >
              {view.status === "PAUSED" ? "Resume Plan" : "Pause Plan"}
            </button>
          </form>
        )}
      </div>

      {view?.status === "PAUSED" && (
        <p className="mt-3 rounded-lg border border-warning/40 bg-warning-surface px-4 py-2 text-sm text-warning">
          Your study plan is paused — activities below are from before pausing. Resume to keep it adapting.
        </p>
      )}

      {!view ? (
        <div className="mt-6">
          <Card title="Select subjects to get started">
            <p className="text-sm text-text-secondary">
              We couldn&apos;t build a plan yet — choose at least one subject below.
            </p>
            <form action={updateStudyPlanSubjectsAction} className="mt-4 space-y-3">
              <div className="grid max-h-[40vh] gap-2 overflow-y-auto sm:grid-cols-2">
                {allSubjects.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      name="subjectIds"
                      value={s.id}
                      defaultChecked={profile.targetSubjects.some((t) => t.id === s.id)}
                      className="h-4 w-4 accent-brand"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
              <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
                Save Subjects
              </button>
            </form>
          </Card>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
            return (
              <DayCard
                key={i}
                label={DAY_LABELS[i]}
                date={date}
                isToday={startOfDay(date).getTime() === startOfDay(now).getTime()}
                items={view.itemsByDate.get(dateKey(date)) ?? []}
              />
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Card title="Study preferences">
          <StudyPreferencesForm
            current={{
              dailyStudyMinutes: profile.dailyStudyMinutes,
              studyDays: profile.studyDays,
              preferredStudyPeriod: profile.preferredStudyPeriod,
            }}
          />
        </Card>
      </div>

      <p className="mt-6 text-xs text-text-muted">
        Activity types: {Object.values(ACTIVITY_TYPE_LABELS).join(", ")}.
      </p>
    </div>
  );
}
