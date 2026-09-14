import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeRevisionPriority } from "../../src/lib/revision/priority";

const NOW = new Date(2026, 8, 14);

describe("computeRevisionPriority", () => {
  test("a repeatedly missed item outranks a one-time miss, all else equal", () => {
    const repeated = computeRevisionPriority({ incorrectCount: 5, status: "LEARNING", daysToExam: null, nextReviewAt: null, now: NOW });
    const oneTime = computeRevisionPriority({ incorrectCount: 1, status: "LEARNING", daysToExam: null, nextReviewAt: null, now: NOW });
    assert.ok(repeated > oneTime);
  });

  test("a MASTERED item ranks lower than a LEARNING item with the same miss count", () => {
    const learning = computeRevisionPriority({ incorrectCount: 2, status: "LEARNING", daysToExam: null, nextReviewAt: null, now: NOW });
    const mastered = computeRevisionPriority({ incorrectCount: 2, status: "MASTERED", daysToExam: null, nextReviewAt: null, now: NOW });
    assert.ok(learning > mastered);
  });

  test("an imminent exam raises priority over a far-off one", () => {
    const soon = computeRevisionPriority({ incorrectCount: 2, status: "LEARNING", daysToExam: 3, nextReviewAt: null, now: NOW });
    const far = computeRevisionPriority({ incorrectCount: 2, status: "LEARNING", daysToExam: 120, nextReviewAt: null, now: NOW });
    assert.ok(soon > far);
  });

  test("an overdue item outranks one not yet due", () => {
    const overdue = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    const notYetDue = new Date(NOW.getTime() + 5 * 24 * 60 * 60 * 1000);
    const overdueScore = computeRevisionPriority({ incorrectCount: 2, status: "LEARNING", daysToExam: null, nextReviewAt: overdue, now: NOW });
    const futureScore = computeRevisionPriority({ incorrectCount: 2, status: "LEARNING", daysToExam: null, nextReviewAt: notYetDue, now: NOW });
    assert.ok(overdueScore > futureScore);
  });

  test("priority is always a finite non-negative number", () => {
    const score = computeRevisionPriority({ incorrectCount: 0, status: "MASTERED", daysToExam: null, nextReviewAt: null, now: NOW });
    assert.ok(Number.isFinite(score) && score >= 0);
  });
});
