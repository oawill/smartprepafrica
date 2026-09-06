import { Card } from "@/components/dashboard/card";
import { TOEFL_CONFIG } from "@/lib/toefl/config";

export function SkillReadinessCard({ label, score }: { label: string; score: number | null }) {
  return (
    <Card title={label}>
      <div className="text-2xl font-semibold text-text-primary">
        {score !== null ? score.toFixed(1) : "--"}
        <span className="text-sm font-normal text-text-muted"> / {TOEFL_CONFIG.scoreScale.max}</span>
      </div>
    </Card>
  );
}
