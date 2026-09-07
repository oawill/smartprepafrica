import type { ReadinessTrend as ReadinessTrendData } from "@/lib/practice/readiness-service";

function DeltaLabel({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-text-muted">Not enough history yet</span>;
  if (delta > 0) return <span className="text-success">+{delta}%</span>;
  if (delta < 0) return <span className="text-danger">{delta}%</span>;
  return <span className="text-text-secondary">No change</span>;
}

export function ReadinessTrend({ trend }: { trend: ReadinessTrendData }) {
  if (trend.current === null) return null;

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5">
      <p className="text-sm font-medium text-text-secondary">Readiness Trend</p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">7 days</p>
          <p className="mt-1 text-sm font-semibold">
            <DeltaLabel delta={trend.sevenDayDelta} />
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">30 days</p>
          <p className="mt-1 text-sm font-semibold">
            <DeltaLabel delta={trend.thirtyDayDelta} />
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Overall</p>
          <p className="mt-1 text-sm font-semibold">
            <DeltaLabel delta={trend.overallDelta} />
          </p>
        </div>
      </div>
    </div>
  );
}
