import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeRow } from "../../src/lib/admin/content-import/normalize";
import { validateSatRow } from "../../src/lib/admin/content-import/validate-sat";

const noCtx = { definedContentSetIds: new Set<string>(), existingContentSetExternalIds: new Set<string>() };

function row(overrides: Record<string, string>) {
  return normalizeRow(
    {
      question_id: "SAT-1",
      section: "MATH",
      domain: "Algebra",
      difficulty: "MEDIUM",
      question_type: "MULTIPLE_CHOICE",
      question_text: "What is 2+2?",
      option_a: "3",
      option_b: "4",
      correct_answer: "B",
      ...overrides,
    },
    1
  );
}

describe("validateSatRow", () => {
  test("a well-formed multiple-choice row is VALID", () => {
    const result = validateSatRow(row({}), noCtx);
    assert.equal(result.status, "VALID");
  });

  test("missing section is an ERROR", () => {
    const result = validateSatRow(row({ section: "" }), noCtx);
    assert.equal(result.status, "ERROR");
  });

  test("invalid section is an ERROR", () => {
    const result = validateSatRow(row({ section: "SCIENCE" }), noCtx);
    assert.equal(result.status, "ERROR");
  });

  test("multiple-choice with fewer than two options is an ERROR", () => {
    const result = validateSatRow(row({ option_a: "", option_b: "" }), noCtx);
    assert.equal(result.status, "ERROR");
  });

  test("correct_answer not matching any option is an ERROR", () => {
    const result = validateSatRow(row({ correct_answer: "Z" }), noCtx);
    assert.equal(result.status, "ERROR");
  });

  test("student-produced-response requires a correct value, not options", () => {
    const spr = row({ question_type: "STUDENT_PRODUCED_RESPONSE", correct_answer: "42", option_a: "", option_b: "" });
    const result = validateSatRow(spr, noCtx);
    assert.equal(result.status, "VALID");
  });

  test("student-produced-response missing a value is an ERROR", () => {
    const spr = row({ question_type: "STUDENT_PRODUCED_RESPONSE", correct_answer: "", option_a: "", option_b: "" });
    const result = validateSatRow(spr, noCtx);
    assert.equal(result.status, "ERROR");
  });

  test("missing difficulty is a WARNING, not an ERROR", () => {
    const result = validateSatRow(row({ difficulty: "" }), noCtx);
    assert.equal(result.status, "WARNING");
  });

  test("a content_set_id that isn't defined anywhere is an ERROR", () => {
    const result = validateSatRow(row({ content_set_id: "UNKNOWN-SET" }), noCtx);
    assert.equal(result.status, "ERROR");
  });

  test("a content_set_id that's already defined in this file is accepted", () => {
    const ctx = { ...noCtx, definedContentSetIds: new Set(["SET-1"]) };
    const result = validateSatRow(row({ content_set_id: "SET-1" }), ctx);
    assert.equal(result.status, "VALID");
  });
});
