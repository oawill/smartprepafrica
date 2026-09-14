import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeRevisionOutcome, REVIEW_INTERVAL_DAYS } from "../../src/lib/revision/schedule";

const NOW = new Date(2026, 8, 14);

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

describe("computeRevisionOutcome", () => {
  test("first successful review schedules a short interval and status LEARNING", () => {
    const result = computeRevisionOutcome({ correctReviewCount: 0 }, true, NOW);
    assert.equal(result.correctReviewCount, 1);
    assert.equal(result.status, "LEARNING");
    assert.equal(daysBetween(NOW, result.nextReviewAt), REVIEW_INTERVAL_DAYS[1]);
  });

  test("second consecutive correct review moves to IMPROVING with a longer interval", () => {
    const result = computeRevisionOutcome({ correctReviewCount: 1 }, true, NOW);
    assert.equal(result.correctReviewCount, 2);
    assert.equal(result.status, "IMPROVING");
    assert.equal(daysBetween(NOW, result.nextReviewAt), REVIEW_INTERVAL_DAYS[2]);
  });

  test("third consecutive correct review reaches MASTERED", () => {
    const result = computeRevisionOutcome({ correctReviewCount: 2 }, true, NOW);
    assert.equal(result.correctReviewCount, 3);
    assert.equal(result.status, "MASTERED");
  });

  test("repeated successful reviews keep increasing the interval, capped at the last rung", () => {
    const result = computeRevisionOutcome({ correctReviewCount: 10 }, true, NOW);
    assert.equal(daysBetween(NOW, result.nextReviewAt), REVIEW_INTERVAL_DAYS[REVIEW_INTERVAL_DAYS.length - 1]);
  });

  test("a wrong review resets progress and shortens the interval, regardless of prior progress", () => {
    const result = computeRevisionOutcome({ correctReviewCount: 3 }, false, NOW);
    assert.equal(result.correctReviewCount, 0);
    assert.equal(result.status, "LEARNING");
    assert.equal(daysBetween(NOW, result.nextReviewAt), REVIEW_INTERVAL_DAYS[0]);
  });

  test("wrong after mastery-level progress still resets rather than staying MASTERED", () => {
    const result = computeRevisionOutcome({ correctReviewCount: 5 }, false, NOW);
    assert.notEqual(result.status, "MASTERED");
  });
});
