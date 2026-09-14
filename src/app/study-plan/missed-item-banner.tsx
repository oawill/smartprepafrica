import type { StudyPlanViewItem } from "@/lib/study-plan/view";
import { resolveMissedStudyPlanItem } from "@/app/study-plan/actions";

/** Non-punitive by design — no red "failed"/"overdue" language, just a
 * neutral fact and four ways forward (brief §10). */
export function MissedItemBanner({ item }: { item: StudyPlanViewItem }) {
  return (
    <div className="rounded-lg border border-warning/40 bg-warning-surface p-3">
      <p className="text-sm text-text-primary">
        You missed this study session: <span className="font-medium">{item.subjectName} — {item.topic}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <form action={resolveMissedStudyPlanItem}>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="action" value="DO_TODAY" />
          <button type="submit" className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
            Do it today
          </button>
        </form>
        <form action={resolveMissedStudyPlanItem}>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="action" value="MOVE_TOMORROW" />
          <button type="submit" className="rounded-full border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-brand">
            Move to tomorrow
          </button>
        </form>
        <details>
          <summary className="cursor-pointer rounded-full border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-brand">
            Reschedule
          </summary>
          <form action={resolveMissedStudyPlanItem} className="mt-2 flex items-center gap-2">
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="action" value="RESCHEDULE" />
            <input type="date" name="date" required className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary" />
            <button type="submit" className="rounded-lg bg-brand px-2.5 py-1 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
              Move
            </button>
          </form>
        </details>
        <form action={resolveMissedStudyPlanItem}>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="action" value="SKIP" />
          <button type="submit" className="rounded-full border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-danger/40 hover:text-danger">
            Skip
          </button>
        </form>
      </div>
    </div>
  );
}
