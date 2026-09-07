import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseCsvRecords } from "../../src/lib/admin/content-import/csv-parser";

describe("parseCsvRecords", () => {
  test("parses header + rows into header->value records", () => {
    const csv = "question_id,section,question_text\nQ1,MATH,\"What is 2+2?\"\nQ2,MATH,\"What is 3+3?\"\n";
    const records = parseCsvRecords(csv);
    assert.equal(records.length, 2);
    assert.deepEqual(records[0], { question_id: "Q1", section: "MATH", question_text: "What is 2+2?" });
    assert.deepEqual(records[1], { question_id: "Q2", section: "MATH", question_text: "What is 3+3?" });
  });

  test("handles quoted commas and escaped quotes", () => {
    const csv = 'question_id,question_text\nQ1,"He said ""hi, there""."\n';
    const records = parseCsvRecords(csv);
    assert.equal(records[0].question_text, 'He said "hi, there".');
  });

  test("empty input returns no records", () => {
    assert.deepEqual(parseCsvRecords(""), []);
  });
});
