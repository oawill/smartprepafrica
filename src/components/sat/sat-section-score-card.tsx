import { Card } from "@/components/dashboard/card";
import { SAT_CONFIG } from "@/lib/sat/config";

export function SatSectionScoreCard({ label, score }: { label: string; score: number | null }) {
  return (
    <Card title={label}>
      <div className="text-2xl font-semibold text-text-primary">
        {score ?? "--"}
        <span className="text-sm font-normal text-text-muted"> / {SAT_CONFIG.scoreScale.sectionMax}</span>
      </div>
    </Card>
  );
}
