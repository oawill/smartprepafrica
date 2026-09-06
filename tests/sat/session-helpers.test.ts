import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { firstUnansweredIndex } from "../../src/lib/sat/session-helpers";

describe("firstUnansweredIndex", () => {
  test("returns 0 when nothing is answered", () => {
    const items = [
      { selectedOption: null, numericAnswer: null },
      { selectedOption: null, numericAnswer: null },
    ];
    assert.equal(firstUnansweredIndex(items), 0);
  });

  test("returns the index of the first item missing both selectedOption and numericAnswer", () => {
    const items = [
      { selectedOption: "A", numericAnswer: null },
      { selectedOption: null, numericAnswer: null },
      { selectedOption: "B", numericAnswer: null },
    ];
    assert.equal(firstUnansweredIndex(items), 1);
  });

  test("a numeric answer counts as answered even with selectedOption null", () => {
    const items = [
      { selectedOption: null, numericAnswer: "42" },
      { selectedOption: null, numericAnswer: null },
    ];
    assert.equal(firstUnansweredIndex(items), 1);
  });

  test("falls back to the last item when everything is answered", () => {
    const items = [
      { selectedOption: "A", numericAnswer: null },
      { selectedOption: "B", numericAnswer: null },
    ];
    assert.equal(firstUnansweredIndex(items), 1);
  });

  test("an empty list returns 0, not a negative index", () => {
    assert.equal(firstUnansweredIndex([]), 0);
  });
});
