import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { Classification, DeadlineUrgency } from "@/lib/education-access/funding-center/scoring";

const CLASSIFICATION_TONE: Record<Classification, BadgeTone> = {
  PRIORITY: "success",
  QUALIFIED: "info",
  RESEARCH_FURTHER: "warning",
  LOW_PRIORITY: "neutral",
};

const CLASSIFICATION_LABEL: Record<Classification, string> = {
  PRIORITY: "Priority",
  QUALIFIED: "Qualified",
  RESEARCH_FURTHER: "Research Further",
  LOW_PRIORITY: "Low Priority",
};

// Eligibility always wins visually — "Not Eligible" replaces the
// score-based classification badge entirely rather than sitting beside
// it, so nobody can glance at a high score and miss a disqualification.
export function ClassificationBadge({
  eligible,
  classification,
  totalScore,
}: {
  eligible: boolean;
  classification: Classification;
  totalScore: number;
}) {
  if (!eligible) {
    return <Badge tone="danger">Not Eligible</Badge>;
  }
  return (
    <Badge tone={CLASSIFICATION_TONE[classification]}>
      {CLASSIFICATION_LABEL[classification]} · {totalScore}
    </Badge>
  );
}

const URGENCY_LABEL: Record<NonNullable<DeadlineUrgency>, string> = {
  "30_DAYS": "Deadline in 30 days",
  "14_DAYS": "Deadline in 14 days",
  "7_DAYS": "Deadline in 7 days",
  "48_HOURS": "Deadline in 48 hours",
  OVERDUE: "Overdue",
};

const URGENCY_TONE: Record<NonNullable<DeadlineUrgency>, BadgeTone> = {
  "30_DAYS": "neutral",
  "14_DAYS": "info",
  "7_DAYS": "warning",
  "48_HOURS": "danger",
  OVERDUE: "danger",
};

export function DeadlineBadge({ urgency }: { urgency: DeadlineUrgency }) {
  if (!urgency) return null;
  return <Badge tone={URGENCY_TONE[urgency]}>{URGENCY_LABEL[urgency]}</Badge>;
}

export function StaleBadge({ stale }: { stale: boolean }) {
  if (!stale) return null;
  return <Badge tone="warning">Funding information may be outdated — verify before applying</Badge>;
}
