import type { NormalizedImportRow } from "@/lib/admin/content-import/normalize";
import { VALID_SOURCE_TYPES } from "@/lib/admin/question-csv";
import { createValidator, isValidUrl, VALID_DIFFICULTIES, VALID_STATUSES, type RowValidationResult } from "@/lib/admin/content-import/validate-common";

const VALID_SKILLS = new Set(["READING", "LISTENING", "SPEAKING", "WRITING"]);
// Speaking/Writing prompts have no answer key — this is a real distinct
// path, not just "MCQ with a blank answer."
const NO_ANSWER_KEY_SKILLS = new Set(["SPEAKING", "WRITING"]);

export type ToeflContentSetContext = {
  definedContentSetIds: Set<string>;
  existingContentSetExternalIds: Set<string>;
};

export function validateToeflRow(row: NormalizedImportRow, ctx: ToeflContentSetContext): RowValidationResult {
  const v = createValidator();

  if (!row.section) v.fail("Missing section/skill.");
  else if (!VALID_SKILLS.has(row.section)) {
    v.fail(`Invalid section "${row.section}" — must be READING, LISTENING, SPEAKING, or WRITING.`);
  }

  if (!row.difficulty) v.warn("Missing difficulty — will default to MEDIUM.");
  else if (!VALID_DIFFICULTIES.has(row.difficulty)) v.fail(`Invalid difficulty "${row.difficulty}".`);

  if (!row.prompt) v.fail("Missing question text.");

  const skill = row.section;
  const isNoAnswerKey = NO_ANSWER_KEY_SKILLS.has(skill);

  if (isNoAnswerKey) {
    if (row.correctOption || row.options.length > 0) {
      v.warn("A correct answer/options was provided but Speaking/Writing prompts have no answer key — it will be ignored.");
    }
  } else if (skill === "READING" || skill === "LISTENING") {
    if (row.options.length < 2) v.fail("At least two answer options are required for a Reading/Listening question.");
    if (!row.correctOption) v.fail("Missing correct answer.");
    else if (!row.options.some((o) => o.key === row.correctOption)) {
      v.fail(`Correct answer "${row.correctOption}" does not match any provided option.`);
    }
    if (skill === "LISTENING" && !row.audioUrl && !row.contentSetExternalId) {
      v.warn("No audio_url provided and this row is not linked to a content set that supplies one.");
    }
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
        `Content set "${row.contentSetExternalId}" is not defined — the first row using this content_set_id must include passage_text or audio_url, or the set must already exist from a prior import.`
      );
    }
  }

  if (row.audioUrl && !isValidUrl(row.audioUrl)) {
    v.warn(`Audio URL "${row.audioUrl}" does not look like a valid http(s) URL.`);
  }
  if (row.imageUrl && !isValidUrl(row.imageUrl)) {
    v.warn(`Image URL "${row.imageUrl}" does not look like a valid http(s) URL.`);
  }

  if (row.sourceType && !VALID_SOURCE_TYPES.has(row.sourceType)) {
    v.fail(`Invalid content_origin "${row.sourceType}".`);
  }

  return v.result();
}
