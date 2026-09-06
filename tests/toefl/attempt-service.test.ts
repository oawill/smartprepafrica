import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  SKILL_SCORE_FIELD,
  submitFreeformAttempt,
  submitDiagnosticAttempt,
  saveSpeakingRecording,
} from "../../src/lib/toefl/attempt-service";
import { TOEFL_SKILLS } from "../../src/lib/toefl/types";

describe("SKILL_SCORE_FIELD", () => {
  test("covers every ToeflSkill with no gaps", () => {
    for (const skill of TOEFL_SKILLS) {
      assert.ok(SKILL_SCORE_FIELD[skill], `missing score field mapping for ${skill}`);
    }
  });

  test("maps each skill to its own distinct score field", () => {
    const fields = Object.values(SKILL_SCORE_FIELD);
    assert.equal(new Set(fields).size, fields.length, "score field mapping has duplicate targets");
  });

  test("READING maps to readingScore", () => {
    assert.equal(SKILL_SCORE_FIELD.READING, "readingScore");
  });

  test("covers SPEAKING (used by the speaking module, Step 8)", () => {
    assert.equal(SKILL_SCORE_FIELD.SPEAKING, "speakingScore");
  });
});

describe("submitFreeformAttempt", () => {
  test("is exported as a shared function (post-rename from submitWritingAttempt)", () => {
    assert.equal(typeof submitFreeformAttempt, "function");
  });
});

describe("Step 9 exports", () => {
  test("submitDiagnosticAttempt is exported as a function", () => {
    assert.equal(typeof submitDiagnosticAttempt, "function");
  });

  test("saveSpeakingRecording is exported as a function (shared by Speaking and Diagnostic)", () => {
    assert.equal(typeof saveSpeakingRecording, "function");
  });
});
