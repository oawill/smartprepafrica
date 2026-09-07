import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseJsonRecords, ImportJsonError } from "../../src/lib/admin/content-import/json-parser";

describe("parseJsonRecords", () => {
  test("parses a top-level array of objects into header->value records", () => {
    const records = parseJsonRecords(JSON.stringify([{ question_id: "Q1", section: "MATH" }]));
    assert.deepEqual(records, [{ question_id: "Q1", section: "MATH" }]);
  });

  test("rejects malformed JSON", () => {
    assert.throws(() => parseJsonRecords("{not valid json"), ImportJsonError);
  });

  test("rejects a top-level object instead of an array", () => {
    assert.throws(() => parseJsonRecords(JSON.stringify({ question_id: "Q1" })), ImportJsonError);
  });

  test("rejects a row that is not an object", () => {
    assert.throws(() => parseJsonRecords(JSON.stringify(["not-an-object"])), ImportJsonError);
  });

  test("null/undefined field values become empty strings", () => {
    const records = parseJsonRecords(JSON.stringify([{ question_id: "Q1", tags: null }]));
    assert.equal(records[0].tags, "");
  });
});
