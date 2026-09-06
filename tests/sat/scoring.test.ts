import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeSectionScore } from "../../src/lib/sat/scoring";

describe("computeSectionScore", () => {
  test("0 correct out of N returns the section minimum (200)", () => {
    assert.equal(computeSectionScore(0, 5), 200);
  });

  test("all correct returns the section maximum (800)", () => {
    assert.equal(computeSectionScore(5, 5), 800);
  });

  test("partial correctness scales proportionally, rounded to nearest 10", () => {
    assert.equal(computeSectionScore(3, 5), 560);
  });

  test("0 total items returns the section minimum, not NaN", () => {
    assert.equal(computeSectionScore(0, 0), 200);
    assert.equal(Number.isNaN(computeSectionScore(0, 0)), false);
  });
});
