import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeSkillScore } from "../../src/lib/toefl/scoring";

describe("computeSkillScore", () => {
  test("0 correct out of N is 0", () => {
    assert.equal(computeSkillScore(0, 5), 0);
  });

  test("all correct is the max score (6)", () => {
    assert.equal(computeSkillScore(5, 5), 6);
  });

  test("partial correctness scales proportionally", () => {
    assert.ok(Math.abs(computeSkillScore(3, 5) - 3.6) < 1e-9);
  });

  test("0 total items returns 0, not NaN", () => {
    assert.equal(computeSkillScore(0, 0), 0);
    assert.equal(Number.isNaN(computeSkillScore(0, 0)), false);
  });
});
