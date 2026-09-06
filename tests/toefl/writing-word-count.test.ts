import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { countWords } from "../../src/lib/toefl/text";

describe("countWords", () => {
  test("empty string is 0", () => {
    assert.equal(countWords(""), 0);
  });

  test("whitespace-only string is 0", () => {
    assert.equal(countWords("   \n\t  "), 0);
  });

  test("counts words separated by multiple spaces once", () => {
    assert.equal(countWords("hello    world"), 2);
  });

  test("ignores leading/trailing whitespace", () => {
    assert.equal(countWords("  hello world  "), 2);
  });

  test("counts a realistic multi-line essay fragment", () => {
    const text = "This is a short\nessay about technology.\n\nIt has several lines.";
    assert.equal(countWords(text), 11);
  });
});
