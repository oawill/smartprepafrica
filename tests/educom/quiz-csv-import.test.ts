// Unit test for parseQuizCsvRow — pure function, no DB, same convention as
// tests/educom/course-access.test.ts. Regression guard for Phase 4's CSV
// quiz-question importer (importQuizQuestionsCsv,
// src/app/dashboard/teacher/courses/actions.ts).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseQuizCsvRow } from "../../src/lib/learning/quiz-csv";

describe("parseQuizCsvRow", () => {
  test("parses a well-formed row", () => {
    const result = parseQuizCsvRow(["2+2=?", "3", "4", "5", "6", "B"]);
    assert.deepEqual(result, {
      ok: true,
      prompt: "2+2=?",
      options: [
        { key: "A", text: "3" },
        { key: "B", text: "4" },
        { key: "C", text: "5" },
        { key: "D", text: "6" },
      ],
      correctOption: "B",
    });
  });

  test("lowercase correct option is normalized to uppercase", () => {
    const result = parseQuizCsvRow(["2+2=?", "3", "4", "5", "6", "b"]);
    assert.equal(result.ok, true);
    assert.equal((result as { correctOption: string }).correctOption, "B");
  });

  test("rejects a row missing the prompt", () => {
    const result = parseQuizCsvRow(["", "3", "4", "5", "6", "B"]);
    assert.equal(result.ok, false);
  });

  test("rejects a row missing an option", () => {
    const result = parseQuizCsvRow(["2+2=?", "3", "4", "", "6", "B"]);
    assert.equal(result.ok, false);
  });

  test("rejects a row with an invalid correct option", () => {
    const result = parseQuizCsvRow(["2+2=?", "3", "4", "5", "6", "E"]);
    assert.equal(result.ok, false);
  });

  test("rejects a row with a blank correct option", () => {
    const result = parseQuizCsvRow(["2+2=?", "3", "4", "5", "6", ""]);
    assert.equal(result.ok, false);
  });
});
