import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeRemainingModuleSec } from "../../src/lib/sat/mock-exam-service";

describe("computeRemainingModuleSec", () => {
  test("null moduleStartedAt (never began, e.g. a non-Mock-Exam attempt) returns the full time limit", () => {
    assert.equal(computeRemainingModuleSec(null, 1200), 1200);
  });

  test("subtracts elapsed time since the module started", () => {
    const startedFiveSecondsAgo = new Date(new Date().getTime() - 5000);
    const remaining = computeRemainingModuleSec(startedFiveSecondsAgo, 1200);
    assert.ok(remaining <= 1195 && remaining >= 1190, `expected ~1195, got ${remaining}`);
  });

  test("never goes negative — a module whose time fully elapsed returns 0", () => {
    const startedAnHourAgo = new Date(new Date().getTime() - 60 * 60 * 1000);
    assert.equal(computeRemainingModuleSec(startedAnHourAgo, 1200), 0);
  });
});
