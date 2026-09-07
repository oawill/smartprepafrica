import type { NormalizedImportRow } from "@/lib/admin/content-import/normalize";
import { VALID_SOURCE_TYPES } from "@/lib/admin/question-csv";
import { createValidator, isValidUrl, VALID_DIFFICULTIES, VALID_STATUSES, type RowValidationResult } from "@/lib/admin/content-import/validate-common";

const VALID_SECTIONS = new Set(["READING_WRITING", "MATH"]);
const VALID_QUESTION_TYPES = new Set(["MULTIPLE_CHOICE", "STUDENT_PRODUCED_RESPONSE"]);

export type SatContentSetContext = {
  definedContentSetIds: Set<string>; // introduced earlier in this same file
  existingContentSetExternalIds: Set<string>; // already in the DB from a prior import
};

export function validateSatRow(row: NormalizedImportRow, ctx: SatContentSetContext): RowValidationResult {
  const v = createValidator();

  if (!row.section) v.fail("Missing section.");
  else if (!VALID_SECTIONS.has(row.section)) v.fail(`Invalid section "${row.section}" — must be READING_WRITING or MATH.`);

  if (!row.domain) v.fail("Missing domain.");

  if (!row.difficulty) v.warn("Missing difficulty — will default to MEDIUM.");
  else if (!VALID_DIFFICULTIES.has(row.difficulty)) v.fail(`Invalid difficulty "${row.difficulty}".`);

  const questionType = row.questionType || "MULTIPLE_CHOICE";
  if (row.questionType && !VALID_QUESTION_TYPES.has(row.questionType)) {
    v.fail(`Unsupported question type "${row.questionType}" — must be MULTIPLE_CHOICE or STUDENT_PRODUCED_RESPONSE.`);
  }

  if (!row.prompt) v.fail("Missing question text.");

  if (questionType === "MULTIPLE_CHOICE") {
    if (row.options.length < 2) v.fail("At least two answer options are required for a multiple-choice question.");
    if (!row.correctOption) v.fail("Missing correct answer.");
    else if (!row.options.some((o) => o.key === row.correctOption)) {
      v.fail(`Correct answer "${row.correctOption}" does not match any provided option.`);
    }
  } else if (questionType === "STUDENT_PRODUCED_RESPONSE") {
    if (!row.correctValue) v.fail("Missing correct value for a student-produced-response question.");
    if (row.options.length > 0) v.warn("Options were provided but will be ignored for a student-produced-response question.");
  }

  if (row.status && !VALID_STATUSES.has(row.status)) {
    v.warn(`Invalid status "${row.status}" — will default to DRAFT.`);
  }

  if (!row.externalId) v.warn("Missing question_id — duplicate detection for this row is limited to matching question text.");

  if (row.contentSetExternalId) {
    const known =
      ctx.definedContentSetIds.has(row.contentSetExternalId) ||
      ctx.existingContentSetExternalIds.has(row.contentSetExternalId);
    if (!known) {
      v.fail(
        `Content set "${row.contentSetExternalId}" is not defined — the first row using this content_set_id must include passage_text or stimulus_image, or the set must already exist from a prior import.`
      );
    }
  }

  if (row.imageUrl && !isValidUrl(row.imageUrl)) {
    v.warn(`Image URL "${row.imageUrl}" does not look like a valid http(s) URL.`);
  }

  if (row.sourceType && !VALID_SOURCE_TYPES.has(row.sourceType)) {
    v.fail(`Invalid content_origin "${row.sourceType}".`);
  }

  const formulaText = `${row.prompt} ${row.explanation}`;
  const dollarCount = (formulaText.match(/\$/g) ?? []).length;
  if (dollarCount % 2 !== 0) v.warn("Possibly broken LaTeX — odd number of $ delimiters.");

  return v.result();
}
