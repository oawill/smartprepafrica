import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SAT_CONFIG } from "../../src/lib/sat/config";

describe("SAT_CONFIG.drill", () => {
  test("has the four spec'd drill sizes", () => {
    assert.equal(SAT_CONFIG.drill.sizes.QUICK, 5);
    assert.equal(SAT_CONFIG.drill.sizes.FOCUS, 10);
    assert.equal(SAT_CONFIG.drill.sizes.PRACTICE_SET, 15);
    assert.equal(SAT_CONFIG.drill.sizes.CHALLENGE, 20);
  });

  test("adaptive and daily drill defaults are 10 questions", () => {
    assert.equal(SAT_CONFIG.drill.adaptiveDefaultSize, 10);
    assert.equal(SAT_CONFIG.drill.dailyDrillSize, 10);
  });
});
