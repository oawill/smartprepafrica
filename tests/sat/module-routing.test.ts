import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { selectNextSATModule } from "../../src/lib/sat/module-routing";

describe("selectNextSATModule", () => {
  test("strong Module 1 performance (>= 60%) routes to the harder Module 2", () => {
    assert.equal(selectNextSATModule(6, 10), "HARDER");
    assert.equal(selectNextSATModule(3, 5), "HARDER"); // exactly 60%
  });

  test("weak Module 1 performance (< 60%) routes to the easier Module 2", () => {
    assert.equal(selectNextSATModule(2, 10), "EASIER");
    assert.equal(selectNextSATModule(0, 5), "EASIER");
  });

  test("0 total items defaults to the easier tier, not a crash", () => {
    assert.equal(selectNextSATModule(0, 0), "EASIER");
  });
});
