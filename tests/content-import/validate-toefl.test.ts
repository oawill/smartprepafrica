import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeRow } from "../../src/lib/admin/content-import/normalize";
import { validateToeflRow } from "../../src/lib/admin/content-import/validate-toefl";

const noCtx = { definedContentSetIds: new Set<string>(), existingContentSetExternalIds: new Set<string>() };

function row(overrides: Record<string, string>) {
  return normalizeRow(
    {
      question_id: "T-1",
      section: "READING",
      difficulty: "MEDIUM",
      question_text: "According to the passage...",
      option_a: "First option",
      option_b: "Second option",
      correct_answer: "A",
      ...overrides,
    },
    1
  );
}

describe("validateToeflRow", () => {
  test("a well-formed Reading MCQ row is VALID", () => {
    const result = validateToeflRow(row({}), noCtx);
    assert.equal(result.status, "VALID");
  });

  test("invalid section/skill is an ERROR", () => {
    const result = validateToeflRow(row({ section: "GRAMMAR" }), noCtx);
    assert.equal(result.status, "ERROR");
  });

  test("Reading/Listening without enough options is an ERROR", () => {
    const result = validateToeflRow(row({ option_a: "", option_b: "" }), noCtx);
    assert.equal(result.status, "ERROR");
  });

  test("a Speaking prompt with no correct answer is VALID — this is the distinct no-answer-key path", () => {
    const speaking = row({ section: "SPEAKING", option_a: "", option_b: "", correct_answer: "", question_text: "Describe a memorable trip." });
    const result = validateToeflRow(speaking, noCtx);
    assert.equal(result.status, "VALID");
  });

  test("a Writing prompt with no correct answer is VALID", () => {
    const writing = row({ section: "WRITING", option_a: "", option_b: "", correct_answer: "", question_text: "Write an essay about..." });
    const result = validateToeflRow(writing, noCtx);
    assert.equal(result.status, "VALID");
  });

  test("a Speaking prompt that DOES include options/answer just gets a warning, not blocked", () => {
    const speaking = row({ section: "SPEAKING", question_text: "Describe a memorable trip." });
    const result = validateToeflRow(speaking, noCtx);
    assert.equal(result.status, "WARNING");
  });

  test("Listening with no audio_url and no content set gets a warning", () => {
    const listening = row({ section: "LISTENING", audio_url: "" });
    const result = validateToeflRow(listening, noCtx);
    assert.equal(result.status, "WARNING");
  });

  test("Listening linked to a defined content set doesn't need its own audio_url", () => {
    const ctx = { ...noCtx, definedContentSetIds: new Set(["SET-1"]) };
    const listening = row({ section: "LISTENING", audio_url: "", content_set_id: "SET-1" });
    const result = validateToeflRow(listening, ctx);
    assert.equal(result.status, "VALID");
  });
});
