import Link from "next/link";
import type { StudyPlanViewItem } from "@/lib/study-plan/view";
import { ACTIVITY_TYPE_LABELS } from "@/lib/study-plan/view";
import { markStudyPlanItemComplete, rescheduleStudyPlanItem } from "@/app/study-plan/actions";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "border-border bg-surface-raised",
  IN_PROGRESS: "border-brand/40 bg-brand/5",
  COMPLETED: "border-success/40 bg-success-surface",
  SKIPPED: "border-border bg-surface-sunken opacity-60",
  MISSED: "border-warning/40 bg-warning-surface",
  RESCHEDULED: "border-border-strong bg-surface-raised",
};

export function ItemRow({ item }: { item: StudyPlanViewItem }) {
  const isDone = item.status === "COMPLETED" || item.status === "SKIPPED";

  return (
    <div className={`rounded-lg border p-3 ${STATUS_STYLES[item.status] ?? "border-border bg-surface-raised"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-text">{item.subjectName}</p>
          <p className="text-sm font-medium text-text-primary">{item.topic}</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {ACTIVITY_TYPE_LABELS[item.activityType]} · {item.recommendedMinutes} min
            {item.isCustom ? " · Added by you" : ""}
          </p>
        </div>
        {isDone && (
          <span className="shrink-0 text-xs font-medium text-success">
            {item.status === "COMPLETED" ? "✓ Done" : "Skipped"}
          </span>
        )}
      </div>

      {!isDone && item.recommendationReason && (
        <p className="mt-2 text-xs text-text-secondary">{item.recommendationReason}</p>
      )}

      {!isDone && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.activityType === "AI_COACH_SESSION" ? (
            <AiCoachPanel
              context={{}}
              defaultMode="STUDY_PLAN"
              triggerLabel="Study With AI Coach"
              triggerClassName="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover"
              suggestedPrompts={[`Let's start today's ${item.subjectName} session.`]}
            />
          ) : item.href ? (
            <Link
              href={item.href}
              className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Start
            </Link>
          ) : null}

          <form action={markStudyPlanItemComplete}>
            <input type="hidden" name="itemId" value={item.id} />
            <button
              type="submit"
              className="rounded-full border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-brand"
            >
              Mark Complete
            </button>
          </form>

          <details>
            <summary className="cursor-pointer rounded-full border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-brand">
              Reschedule
            </summary>
            <form action={rescheduleStudyPlanItem} className="mt-2 flex items-center gap-2">
              <input type="hidden" name="itemId" value={item.id} />
              <input
                type="date"
                name="date"
                required
                className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary"
              />
              <button
                type="submit"
                className="rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Move
              </button>
            </form>
          </details>
        </div>
      )}
    </div>
  );
}
