import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MONTHLY_LIMITS, getStartOfCalendarMonth } from "../../src/lib/ai/limits";

describe("AI Tutor monthly usage limits", () => {
  test("Premium defaults to 50 AI Tutor sessions per month", () => {
    assert.equal(DEFAULT_MONTHLY_LIMITS.PREMIUM, 50);
  });

  test("Pro's fair-use ceiling is 2,000/month", () => {
    assert.equal(DEFAULT_MONTHLY_LIMITS.PRO, 2000);
  });

  test("Free/Basic/School are scaled 30x from their former daily caps (5/15/50)", () => {
    assert.equal(DEFAULT_MONTHLY_LIMITS.FREE, 150);
    assert.equal(DEFAULT_MONTHLY_LIMITS.BASIC, 450);
    assert.equal(DEFAULT_MONTHLY_LIMITS.SCHOOL, 1500);
  });
});

describe("getStartOfCalendarMonth", () => {
  test("returns midnight on the 1st of the given date's month", () => {
    const start = getStartOfCalendarMonth(new Date(2026, 5, 17, 13, 45));
    assert.equal(start.getFullYear(), 2026);
    assert.equal(start.getMonth(), 5);
    assert.equal(start.getDate(), 1);
    assert.equal(start.getHours(), 0);
  });

  test("a date already on the 1st stays on the 1st", () => {
    const start = getStartOfCalendarMonth(new Date(2026, 0, 1, 23, 59));
    assert.equal(start.getDate(), 1);
    assert.equal(start.getMonth(), 0);
  });

  test("December rolls to the correct year boundary", () => {
    const start = getStartOfCalendarMonth(new Date(2025, 11, 31));
    assert.equal(start.getFullYear(), 2025);
    assert.equal(start.getMonth(), 11);
    assert.equal(start.getDate(), 1);
  });
});
