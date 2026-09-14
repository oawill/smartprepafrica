import { Card } from "@/components/dashboard/card";
import type { StudyPlanViewItem } from "@/lib/study-plan/view";
import { ItemRow } from "@/app/study-plan/item-row";

export function DayCard({
  label,
  date,
  isToday,
  items,
}: {
  label: string;
  date: Date;
  isToday: boolean;
  items: StudyPlanViewItem[];
}) {
  const pending = items.filter((i) => i.status !== "COMPLETED" && i.status !== "SKIPPED" && i.status !== "MISSED");
  const done = items.filter((i) => i.status === "COMPLETED" || i.status === "SKIPPED");
  const totalMinutes = items.reduce((sum, i) => sum + i.recommendedMinutes, 0);

  return (
    <Card
      id={isToday ? "today" : undefined}
      className={isToday ? "border-brand/50 ring-1 ring-brand/30" : undefined}
      title={`${label}${isToday ? " · Today" : ""} — ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
    >
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">No study activities scheduled.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-text-muted">{totalMinutes} min planned</p>
          <div className="space-y-2">
            {pending.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
          {done.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-text-muted hover:text-text-secondary">
                {done.length} completed
              </summary>
              <div className="mt-2 space-y-2">
                {done.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </Card>
  );
}
