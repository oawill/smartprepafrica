import Link from "next/link";
import type { StudyPlanViewItem } from "@/lib/study-plan/view";
import { ACTIVITY_TYPE_LABELS } from "@/lib/study-plan/view";
import { markStudyPlanItemComplete, resolveMissedStudyPlanItem, rescheduleStudyPlanItem } from "@/app/study-plan/actions";
import { startTodayActivity } from "@/app/study/today/actions";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";

/** The single focused activity Today's Study shows right now — bigger
 * and more deliberate than the compact list item on /study-plan, since
 * this is the whole screen rather than one row among many. */
export function ActivityCard({ item }: { item: StudyPlanViewItem }) {
  const isAiCoach = item.activityType === "AI_COACH_SESSION";

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-text">{item.subjectName}</p>
      <h2 className="mt-1 text-h1 font-semibold text-text-primary">{item.topic}</h2>
      <p className="mt-2 text-sm text-text-secondary">
        {ACTIVITY_TYPE_LABELS[item.activityType]} · Estimated time: {item.recommendedMinutes} minutes
      </p>

      {item.recommendationReason && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Why this is recommended</p>
          <p className="mt-1 text-sm text-text-secondary">{item.recommendationReason}</p>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {isAiCoach ? (
          <AiCoachPanel
            context={{}}
            defaultMode="STUDY_PLAN"
            triggerLabel="Start Activity"
            triggerClassName="w-full rounded-lg bg-brand py-3 text-center text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            suggestedPrompts={[`Let's work on ${item.topic}.`]}
          />
        ) : (
          <form action={startTodayActivity}>
            <input type="hidden" name="itemId" value={item.id} />
            <button
              type="submit"
              className="w-full rounded-lg bg-brand py-3 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Start Activity
            </button>
          </form>
        )}

        {isAiCoach && (
          <form action={markStudyPlanItemComplete}>
            <input type="hidden" name="itemId" value={item.id} />
            <button
              type="submit"
              className="w-full rounded-lg border border-border-strong py-2.5 text-sm text-text-secondary hover:border-brand"
            >
              Mark Complete
            </button>
          </form>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <form action={resolveMissedStudyPlanItem}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="action" value="SKIP" />
            <button type="submit" className="text-xs text-text-muted hover:text-text-secondary">
              Skip for now
            </button>
          </form>
          <details className="text-center">
            <summary className="cursor-pointer text-xs text-text-muted hover:text-text-secondary">Reschedule</summary>
            <form action={rescheduleStudyPlanItem} className="mt-2 flex items-center gap-2">
              <input type="hidden" name="itemId" value={item.id} />
              <input
                type="date"
                name="date"
                required
                className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary"
              />
              <button type="submit" className="rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
                Move
              </button>
            </form>
          </details>
          <Link href="/study-plan" className="text-xs text-text-muted hover:text-text-secondary">
            View Today&apos;s Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
