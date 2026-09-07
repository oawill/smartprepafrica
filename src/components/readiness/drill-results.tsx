import type { ExamType } from "@prisma/client";
import type { RecommendedDrill } from "@/lib/practice/readiness-service";
import { classifyAccuracy, type AccuracyTier } from "@/lib/practice/readiness-service";
import { Badge } from "@/components/ui/badge";
import { RecommendedNextStep } from "@/components/readiness/recommended-next-step";

export type TopicBucket = { topic: string; correct: number; total: number };

const TIER_META: Record<AccuracyTier, { label: string; tone: "success" | "warning" | "danger" }> = {
  STRONG: { label: "Strong", tone: "success" },
  REVIEW: { label: "Review", tone: "warning" },
  WEAK: { label: "Weak", tone: "danger" },
};

function TierColumn({ tier, topics }: { tier: AccuracyTier; topics: string[] }) {
  const meta = TIER_META[tier];
  return (
    <div>
      <Badge tone={meta.tone}>{meta.label}</Badge>
      {topics.length === 0 ? (
        <p className="mt-2 text-xs text-text-muted">—</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-text-secondary">
          {topics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Drill Complete" post-drill analysis — score + per-topic strong/review/
 * weak breakdown computed from THIS attempt's own accuracy (not the
 * long-term EMA mastery — a short drill's per-topic accuracy is the
 * relevant signal right after finishing it) + a Recommended Next Step CTA. */
export function DrillResults({
  exam,
  score,
  correctCount,
  totalItems,
  topicBuckets,
  recommendation,
}: {
  exam: ExamType;
  score: number;
  correctCount: number;
  totalItems: number;
  topicBuckets: TopicBucket[];
  recommendation: RecommendedDrill;
}) {
  const byTier: Record<AccuracyTier, string[]> = { STRONG: [], REVIEW: [], WEAK: [] };
  for (const bucket of topicBuckets) {
    const accuracyPct = Math.round((bucket.correct / bucket.total) * 100);
    byTier[classifyAccuracy(accuracyPct)].push(bucket.topic);
  }

  return (
    <div className="rounded-2xl border border-brand/30 bg-brand/5 p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-text">Drill Complete</p>
      <p className="mt-1 text-2xl font-semibold text-text-primary">
        Score: {correctCount}/{totalItems} — {Math.round(score)}%
      </p>

      {topicBuckets.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <TierColumn tier="STRONG" topics={byTier.STRONG} />
          <TierColumn tier="REVIEW" topics={byTier.REVIEW} />
          <TierColumn tier="WEAK" topics={byTier.WEAK} />
        </div>
      )}

      {recommendation && (
        <div className="mt-5">
          <RecommendedNextStep exam={exam} recommendation={recommendation} />
        </div>
      )}
    </div>
  );
}
