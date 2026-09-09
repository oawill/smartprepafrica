// Pure-function tests for computeStreakUpdate — day-boundary arithmetic
// is exactly the kind of thing worth pinning down with tests. Same
// convention as tests/school/performance.test.ts (no DB).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeStreakUpdate } from "../../src/lib/gamification/xp-service";

describe("computeStreakUpdate", () => {
  test("first-ever activity (null lastActivityDate) starts the streak at 1", () => {
    const result = computeStreakUpdate(null, new Date("2026-01-10"), 0, 0);
    assert.equal(result.currentStreakDays, 1);
    assert.equal(result.longestStreakDays, 1);
  });

  test("a second activity on the same calendar day leaves the streak unchanged", () => {
    const morning = new Date("2026-01-10T08:00:00");
    const evening = new Date("2026-01-10T20:00:00");
    const result = computeStreakUpdate(morning, evening, 3, 5);
    assert.equal(result.currentStreakDays, 3);
    assert.equal(result.longestStreakDays, 5);
  });

  test("activity exactly one day later increments the streak", () => {
    const yesterday = new Date("2026-01-10");
    const today = new Date("2026-01-11");
    const result = computeStreakUpdate(yesterday, today, 3, 5);
    assert.equal(result.currentStreakDays, 4);
    assert.equal(result.longestStreakDays, 5);
  });

  test("a new current streak that exceeds the prior longest updates longestStreakDays", () => {
    const yesterday = new Date("2026-01-10");
    const today = new Date("2026-01-11");
    const result = computeStreakUpdate(yesterday, today, 5, 5);
    assert.equal(result.currentStreakDays, 6);
    assert.equal(result.longestStreakDays, 6);
  });

  test("a multi-day gap resets the current streak to 1 without touching longestStreakDays", () => {
    const lastWeek = new Date("2026-01-01");
    const today = new Date("2026-01-11");
    const result = computeStreakUpdate(lastWeek, today, 7, 10);
    assert.equal(result.currentStreakDays, 1);
    assert.equal(result.longestStreakDays, 10);
  });
});
