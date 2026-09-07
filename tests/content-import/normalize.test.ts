import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeRow, parseTags, parseBoolean, optionsFromRecord } from "../../src/lib/admin/content-import/normalize";

describe("normalizeRow", () => {
  test("maps SAT-style columns into the shared shape", () => {
    const row = normalizeRow(
      { question_id: "Q1", section: "MATH", domain: "Algebra", difficulty: "easy", question_text: "2+2?" },
      3
    );
    assert.equal(row.rowNumber, 3);
    assert.equal(row.externalId, "Q1");
    assert.equal(row.section, "MATH");
    assert.equal(row.domain, "Algebra");
    assert.equal(row.difficulty, "EASY");
    assert.equal(row.prompt, "2+2?");
  });

  test("falls back to the skill column for section when TOEFL uses `skill` instead of `section`", () => {
    const row = normalizeRow({ skill: "reading" }, 1);
    assert.equal(row.section, "READING");
  });

  test("status defaults to DRAFT when absent", () => {
    const row = normalizeRow({}, 1);
    assert.equal(row.status, "DRAFT");
  });
});

describe("optionsFromRecord", () => {
  test("collects only non-empty option_a..e columns", () => {
    const options = optionsFromRecord({ option_a: "First", option_b: "", option_c: "Third" });
    assert.deepEqual(options, [
      { key: "A", text: "First" },
      { key: "C", text: "Third" },
    ]);
  });
});

describe("parseTags", () => {
  test("splits on commas and trims", () => {
    assert.deepEqual(parseTags("algebra, quadratics ,  functions"), ["algebra", "quadratics", "functions"]);
  });
  test("empty string yields no tags", () => {
    assert.deepEqual(parseTags(""), []);
  });
});

describe("parseBoolean", () => {
  test("recognizes common truthy strings", () => {
    for (const v of ["true", "1", "yes", "Y", "TRUE"]) assert.equal(parseBoolean(v), true);
  });
  test("everything else is false", () => {
    for (const v of ["false", "0", "no", "", "maybe"]) assert.equal(parseBoolean(v), false);
  });
});
