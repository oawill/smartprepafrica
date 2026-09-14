import Link from "next/link";
import { Card } from "@/components/dashboard/card";
import type { StudyPlanViewItem } from "@/lib/study-plan/view";
import { ACTIVITY_TYPE_LABELS } from "@/lib/study-plan/view";
import { markStudyPlanItemComplete } from "@/app/study-plan/actions";

export function StudyPlanCard({
  hasPreferences,
  todayItems,
  totalMinutesToday,
  weeklyCompletionPct,
  nextActivity,
  currentStreakDays,
}: {
  hasPreferences: boolean;
  todayItems: StudyPlanViewItem[];
  totalMinutesToday: number;
  weeklyCompletionPct: number | null;
  nextActivity: StudyPlanViewItem | null;
  currentStreakDays: number;
}) {
  if (!hasPreferences) {
    return (
      <div className="mt-6">
        <Card title="Build your personalized study plan">
          <p className="text-sm text-text-secondary">
            Tell us your subjects, study goals, and available study time so SmartPrepAfrica can create your weekly
            study plan.
          </p>
          <Link
            href="/study-plan"
            className="mt-3 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Create My Study Plan
          </Link>
        </Card>
      </div>
    );
  }

  const pendingToday = todayItems.filter((i) => i.status !== "COMPLETED" && i.status !== "SKIPPED");

  return (
    <div className="mt-6">
      <Card title="Your Study Plan">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-text-primary">Today&apos;s Plan</p>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            {currentStreakDays > 0 && <span>{currentStreakDays}-day study streak 🔥</span>}
            {weeklyCompletionPct !== null && <span>{weeklyCompletionPct}% of this week done</span>}
          </div>
        </div>

        {pendingToday.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">
            {todayItems.length > 0 ? "Everything for today is done — nice work." : "Nothing scheduled for today."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pendingToday.slice(0, 4).map((item) => (
              <li key={item.id} className="rounded-lg border border-border bg-surface-sunken p-2.5">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-text">{item.subjectName}</p>
                <p className="text-sm text-text-primary">{item.topic}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    {ACTIVITY_TYPE_LABELS[item.activityType]} · {item.recommendedMinutes} min
                  </span>
                  <div className="flex gap-2">
                    {item.href && (
                      <Link href={item.href} className="text-xs font-medium text-brand-text hover:underline">
                        Start
                      </Link>
                    )}
                    <form action={markStudyPlanItemComplete}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button type="submit" className="text-xs font-medium text-text-secondary hover:text-brand-text">
                        Mark Complete
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-text-muted">
          {totalMinutesToday} min planned today
          {nextActivity && pendingToday.length === 0
            ? ` · Next up: ${nextActivity.subjectName} — ${nextActivity.topic}`
            : ""}
        </p>

        <Link href="/study-plan" className="mt-3 inline-block text-sm font-medium text-brand-text hover:underline">
          View Full Week →
        </Link>
      </Card>
    </div>
  );
}
