import type { RevisionItemStatus } from "@prisma/client";

/** Days-out for the Nth consecutive correct review (0-indexed, capped at
 * the last entry) — a fixed, documented ladder, not a scientifically-
 * tuned spaced-repetition algorithm (deliberately out of scope per the
 * brief: "do not build a scientifically overcomplicated algorithm"). */
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 16, 35];

export type RevisionOutcome = {
  status: RevisionItemStatus;
  nextReviewAt: Date;
  correctReviewCount: number;
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Pure state machine driving both the review-interval ladder (brief §8)
 * and the NEW/LEARNING/IMPROVING/MASTERED lifecycle (brief §9). A wrong
 * answer always resets consecutive-correct progress and shortens the
 * interval back to the first rung; a correct answer advances one rung
 * and moves status up once enough consecutive correct reviews have
 * accumulated. Never called for the very first miss itself (that just
 * creates a NEW item with no review scheduled yet) — only for actual
 * review attempts, correct or not. */
export function computeRevisionOutcome(
  current: { correctReviewCount: number },
  wasCorrect: boolean,
  now: Date = new Date()
): RevisionOutcome {
  if (!wasCorrect) {
    return {
      status: "LEARNING",
      nextReviewAt: addDays(now, REVIEW_INTERVAL_DAYS[0]),
      correctReviewCount: 0,
    };
  }

  const correctReviewCount = current.correctReviewCount + 1;
  const intervalDays = REVIEW_INTERVAL_DAYS[Math.min(correctReviewCount, REVIEW_INTERVAL_DAYS.length - 1)];
  const status: RevisionItemStatus = correctReviewCount >= 3 ? "MASTERED" : correctReviewCount >= 2 ? "IMPROVING" : "LEARNING";

  return {
    status,
    nextReviewAt: addDays(now, intervalDays),
    correctReviewCount,
  };
}
