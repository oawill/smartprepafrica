import type { ReadinessStatus } from "@/lib/practice/readiness-service";
import { READINESS_STATUS_META } from "@/lib/practice/readiness-service";
import { Badge } from "@/components/ui/badge";
import { READINESS_STATUS_TONE } from "@/components/readiness/status-meta";

/** The big score + 🟢/🟠/🔴 + text label — status is always communicated
 * as icon+text together (Badge's default-icon behavior), never color alone. */
export function ReadinessScore({
  label,
  pct,
  status,
  size = "lg",
}: {
  label: string;
  pct: number | null;
  status: ReadinessStatus;
  size?: "lg" | "sm";
}) {
  const meta = READINESS_STATUS_META[status];

  return (
    <div>
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      {pct === null ? (
        <div className="mt-1 flex items-center gap-2">
          <span className={size === "lg" ? "text-3xl font-semibold text-text-muted" : "text-xl font-semibold text-text-muted"}>
            —
          </span>
          <Badge tone={READINESS_STATUS_TONE.NOT_ENOUGH_DATA}>{meta.label}</Badge>
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <span className={size === "lg" ? "text-4xl font-semibold text-text-primary" : "text-2xl font-semibold text-text-primary"}>
            {pct}%
          </span>
          <Badge tone={READINESS_STATUS_TONE[status]}>
            {meta.emoji} {meta.label}
          </Badge>
        </div>
      )}
    </div>
  );
}
