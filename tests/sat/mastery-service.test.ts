import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { masteryLabel } from "../../src/lib/sat/mastery-service";

describe("masteryLabel", () => {
  test("returns null (not a fabricated label) below the confidence trust threshold", () => {
    assert.equal(masteryLabel(95, 0.1), null);
    assert.equal(masteryLabel(10, 0.15), null);
  });

  test("Needs Practice below 60", () => {
    assert.equal(masteryLabel(0, 0.5), "Needs Practice");
    assert.equal(masteryLabel(59, 0.5), "Needs Practice");
  });

  test("Developing 60-74", () => {
    assert.equal(masteryLabel(60, 0.5), "Developing");
    assert.equal(masteryLabel(74, 0.5), "Developing");
  });

  test("Proficient 75-89", () => {
    assert.equal(masteryLabel(75, 0.5), "Proficient");
    assert.equal(masteryLabel(89, 0.5), "Proficient");
  });

  test("Strong 90+", () => {
    assert.equal(masteryLabel(90, 0.5), "Strong");
    assert.equal(masteryLabel(100, 1), "Strong");
  });

  test("confidence exactly at the threshold still returns null (not enough data)", () => {
    assert.equal(masteryLabel(80, 0.15), null);
  });
});
