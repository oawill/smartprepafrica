import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseCsvRecords } from "../../src/lib/admin/content-import/csv-parser";
import {
  generateSatImportTemplate,
  generateToeflImportTemplate,
  SAT_IMPORT_HEADERS,
  TOEFL_IMPORT_HEADERS,
} from "../../src/lib/admin/content-import/templates";
import { normalizeRow } from "../../src/lib/admin/content-import/normalize";
import { validateSatRow } from "../../src/lib/admin/content-import/validate-sat";
import { validateToeflRow } from "../../src/lib/admin/content-import/validate-toefl";

const noCtx = { definedContentSetIds: new Set<string>(), existingContentSetExternalIds: new Set<string>() };

describe("SAT import template", () => {
  test("its own example row is valid against the SAT validator", () => {
    const [record] = parseCsvRecords(generateSatImportTemplate());
    assert.deepEqual(Object.keys(record).sort(), [...SAT_IMPORT_HEADERS].sort());
    const row = normalizeRow(record, 2);
    assert.equal(validateSatRow(row, noCtx).status, "VALID");
  });
});

describe("TOEFL import template", () => {
  test("its own example row is valid against the TOEFL validator", () => {
    const [record] = parseCsvRecords(generateToeflImportTemplate());
    assert.deepEqual(Object.keys(record).sort(), [...TOEFL_IMPORT_HEADERS].sort());
    const row = normalizeRow(record, 2);
    // The template's example row both defines and uses TOEFL-R-001 (it has
    // passage_text) — in the real pipeline, definedContentSetIds is built
    // from a first pass over every row in the file before any row is
    // validated, so this row would already recognize its own content set.
    const ctx = { ...noCtx, definedContentSetIds: new Set([row.contentSetExternalId]) };
    assert.equal(validateToeflRow(row, ctx).status, "VALID");
  });
});
