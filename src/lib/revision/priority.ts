import type { RevisionItemStatus } from "@prisma/client";
import { examProximityBucket } from "@/lib/study-plan/scheduler";

const STATUS_WEIGHT: Record<RevisionItemStatus, number> = {
  NEW: 1,
  LEARNING: 1,
  IMPROVING: 0.5,
  MASTERED: 0.1,
};

const URGENCY_WEIGHT: Record<ReturnType<typeof examProximityBucket>, number> = {
  FAR: 0.2,
  MID: 0.4,
  NEAR: 0.6,
  CLOSE: 0.8,
  IMMINENT: 1,
};

function overdueFactor(nextReviewAt: Date | null, now: Date): number {
  if (!nextReviewAt) return 0.6; // never reviewed yet — moderately urgent by default
  const daysOverdue = (now.getTime() - nextReviewAt.getTime()) / (24 * 60 * 60 * 1000);
  if (daysOverdue >= 3) return 1;
  if (daysOverdue >= 0) return 0.8;
  if (daysOverdue >= -2) return 0.4; // due soon
  return 0.1; // not due for a while
}

/** Deterministic, computed and stored at write time (never recomputed on
 * every /revision read — see StudentRevisionItem's own doc comment).
 * Weights sum to 100: repeated wrong answers matter most, then how far
 * along the review lifecycle the item is, then exam urgency (reusing
 * the scheduler's own days-to-exam bucketing, not reimplemented), then
 * how overdue it is. */
export function computeRevisionPriority(input: {
  incorrectCount: number;
  status: RevisionItemStatus;
  daysToExam: number | null;
  nextReviewAt: Date | null;
  now?: Date;
}): number {
  const now = input.now ?? new Date();
  const repeatedWeight = 40 * Math.min(1, input.incorrectCount / 5);
  const statusWeight = 20 * STATUS_WEIGHT[input.status];
  const urgencyWeight = 20 * URGENCY_WEIGHT[examProximityBucket(input.daysToExam)];
  const overdueWeight = 20 * overdueFactor(input.nextReviewAt, now);

  return Math.round(repeatedWeight + statusWeight + urgencyWeight + overdueWeight);
}
