// Unit test for averageScore — pure function, no DB, same convention as
// tests/plans/pricing.test.ts. Regression guard for the school dashboard's
// performance benchmark: school/state/national averages must all use the
// exact same semantics (ignore ungraded attempts entirely, rather than the
// prior inline behavior of counting them as a 0 score while still
// including them in the denominator).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { averageScore } from "../../src/lib/school-performance";

describe("averageScore", () => {
  test("returns null for an empty list, not 0 or NaN", () => {
    assert.equal(averageScore([]), null);
  });

  test("returns null when every attempt is ungraded (null score)", () => {
    assert.equal(averageScore([{ score: null }, { score: null }]), null);
  });

  test("ignores null-score attempts rather than counting them as 0", () => {
    // Previously the school dashboard's inline computation divided by
    // attempts.length including ungraded ones (treating them as 0),
    // dragging the average down. A student with two 80% attempts and one
    // still-ungraded attempt should average to 80, not 53.
    const result = averageScore([{ score: 80 }, { score: 80 }, { score: null }]);
    assert.equal(result, 80);
  });

  test("rounds to the nearest whole number", () => {
    const result = averageScore([{ score: 70 }, { score: 71 }, { score: 71 }]);
    assert.equal(result, Math.round((70 + 71 + 71) / 3));
  });

  test("a single graded attempt returns its own score", () => {
    assert.equal(averageScore([{ score: 55 }]), 55);
  });
});
