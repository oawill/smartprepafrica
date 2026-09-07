import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  classifyReadiness,
  classifyMastery,
  classifyAccuracy,
  computeTrendDeltas,
} from "../../src/lib/practice/readiness-service";

describe("classifyReadiness", () => {
  test("below the confidence trust threshold is NOT_ENOUGH_DATA regardless of score", () => {
    assert.equal(classifyReadiness(95, 0.1), "NOT_ENOUGH_DATA");
    assert.equal(classifyReadiness(10, 0.15), "NOT_ENOUGH_DATA");
  });

  test("a null score is NOT_ENOUGH_DATA even with high confidence", () => {
    assert.equal(classifyReadiness(null, 1), "NOT_ENOUGH_DATA");
  });

  test("matches the spec's worked example: 81/77 STRONG, 64/69 NEEDS_IMPROVEMENT, 51 PRIORITY_REVIEW", () => {
    assert.equal(classifyReadiness(81, 1), "STRONG");
    assert.equal(classifyReadiness(77, 1), "STRONG");
    assert.equal(classifyReadiness(64, 1), "NEEDS_IMPROVEMENT");
    assert.equal(classifyReadiness(69, 1), "NEEDS_IMPROVEMENT");
    assert.equal(classifyReadiness(51, 1), "PRIORITY_REVIEW");
  });

  test("boundaries: 75 is STRONG, 74 is NEEDS_IMPROVEMENT, 60 is NEEDS_IMPROVEMENT, 59 is PRIORITY_REVIEW", () => {
    assert.equal(classifyReadiness(75, 1), "STRONG");
    assert.equal(classifyReadiness(74, 1), "NEEDS_IMPROVEMENT");
    assert.equal(classifyReadiness(60, 1), "NEEDS_IMPROVEMENT");
    assert.equal(classifyReadiness(59, 1), "PRIORITY_REVIEW");
  });
});

describe("classifyMastery", () => {
  test("below the confidence trust threshold is NOT_ENOUGH_DATA", () => {
    assert.equal(classifyMastery(90, 0.1), "NOT_ENOUGH_DATA");
  });

  test("matches the spec's worked topic-mastery example", () => {
    assert.equal(classifyMastery(82, 1), "STRONG");
    assert.equal(classifyMastery(86, 1), "STRONG");
    assert.equal(classifyMastery(61, 1), "REVIEW");
    assert.equal(classifyMastery(43, 1), "WEAK");
    assert.equal(classifyMastery(72, 1), "IMPROVING");
  });

  test("boundaries: 80 STRONG, 79 IMPROVING, 65 IMPROVING, 64 REVIEW, 50 REVIEW, 49 WEAK", () => {
    assert.equal(classifyMastery(80, 1), "STRONG");
    assert.equal(classifyMastery(79, 1), "IMPROVING");
    assert.equal(classifyMastery(65, 1), "IMPROVING");
    assert.equal(classifyMastery(64, 1), "REVIEW");
    assert.equal(classifyMastery(50, 1), "REVIEW");
    assert.equal(classifyMastery(49, 1), "WEAK");
  });
});

describe("classifyAccuracy", () => {
  test("STRONG at 75+, REVIEW 60-74, WEAK below 60", () => {
    assert.equal(classifyAccuracy(100), "STRONG");
    assert.equal(classifyAccuracy(75), "STRONG");
    assert.equal(classifyAccuracy(74), "REVIEW");
    assert.equal(classifyAccuracy(60), "REVIEW");
    assert.equal(classifyAccuracy(59), "WEAK");
    assert.equal(classifyAccuracy(0), "WEAK");
  });
});

describe("computeTrendDeltas", () => {
  const now = new Date("2026-06-15T00:00:00Z");

  test("no snapshots returns all nulls, never a fabricated number", () => {
    assert.deepEqual(computeTrendDeltas([], now), {
      current: null,
      sevenDayDelta: null,
      thirtyDayDelta: null,
      overallDelta: null,
    });
  });

  test("a single snapshot has a current value but no deltas yet", () => {
    const result = computeTrendDeltas([{ day: now, readinessPct: 61 }], now);
    assert.equal(result.current, 61);
    assert.equal(result.overallDelta, null);
    assert.equal(result.sevenDayDelta, null);
  });

  test("computes the spec's worked example: 61% -> 72% this month", () => {
    const monthAgo = new Date("2026-05-16T00:00:00Z");
    const result = computeTrendDeltas(
      [
        { day: monthAgo, readinessPct: 61 },
        { day: now, readinessPct: 72 },
      ],
      now
    );
    assert.equal(result.current, 72);
    assert.equal(result.overallDelta, 11);
    assert.equal(result.thirtyDayDelta, 11);
  });

  test("no snapshot old enough for the 7-day window returns null for that delta, not a guess", () => {
    const twoDaysAgo = new Date("2026-06-13T00:00:00Z");
    const result = computeTrendDeltas(
      [
        { day: twoDaysAgo, readinessPct: 50 },
        { day: now, readinessPct: 55 },
      ],
      now
    );
    assert.equal(result.sevenDayDelta, null);
    assert.equal(result.overallDelta, 5);
  });

  test("a negative delta (readiness dropped) is reported as negative, not clamped", () => {
    const eightDaysAgo = new Date("2026-06-07T00:00:00Z");
    const result = computeTrendDeltas(
      [
        { day: eightDaysAgo, readinessPct: 80 },
        { day: now, readinessPct: 70 },
      ],
      now
    );
    assert.equal(result.sevenDayDelta, -10);
  });
});
