import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { allocateWeightedDrillSizes } from "../../src/lib/practice/smart-selection";

function sum(record: Record<string, number>): number {
  return Object.values(record).reduce((a, b) => a + b, 0);
}

describe("allocateWeightedDrillSizes", () => {
  test("equal readiness across subjects splits close to evenly", () => {
    const result = allocateWeightedDrillSizes(
      [
        { id: "a", readinessPct: 70 },
        { id: "b", readinessPct: 70 },
      ],
      20
    );
    assert.equal(sum(result), 20);
    assert.ok(Math.abs(result.a - result.b) <= 1);
  });

  test("a weaker subject gets more questions than a stronger one", () => {
    const result = allocateWeightedDrillSizes(
      [
        { id: "weak", readinessPct: 30 },
        { id: "strong", readinessPct: 90 },
      ],
      20
    );
    assert.equal(sum(result), 20);
    assert.ok(result.weak > result.strong);
  });

  test("never completely neglects a subject — every subject gets at least 1", () => {
    const result = allocateWeightedDrillSizes(
      [
        { id: "very-weak", readinessPct: 5 },
        { id: "a", readinessPct: 95 },
        { id: "b", readinessPct: 95 },
        { id: "c", readinessPct: 95 },
        { id: "d", readinessPct: 95 },
      ],
      9
    );
    assert.equal(sum(result), 9);
    for (const size of Object.values(result)) assert.ok(size >= 1);
  });

  test("a subject with no readiness score yet (null) is treated as neutral, not zero", () => {
    const result = allocateWeightedDrillSizes(
      [
        { id: "unknown", readinessPct: null },
        { id: "weak", readinessPct: 20 },
        { id: "strong", readinessPct: 90 },
      ],
      30
    );
    assert.equal(sum(result), 30);
    // Neutral (treated as 50) should sit between weak (20) and strong (90).
    assert.ok(result.weak >= result.unknown);
    assert.ok(result.unknown >= result.strong);
  });

  test("fewer questions than subjects: only the weakest subjects get an allocation of 1", () => {
    const result = allocateWeightedDrillSizes(
      [
        { id: "a", readinessPct: 80 },
        { id: "b", readinessPct: 20 },
        { id: "c", readinessPct: 50 },
      ],
      2
    );
    assert.equal(sum(result), 2);
    assert.equal(result.a, undefined);
    assert.equal(result.b, 1);
    assert.equal(result.c, 1);
  });

  test("empty subjects or zero size returns an empty allocation", () => {
    assert.deepEqual(allocateWeightedDrillSizes([], 20), {});
    assert.deepEqual(allocateWeightedDrillSizes([{ id: "a", readinessPct: 50 }], 0), {});
  });
});
