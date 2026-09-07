/** One row shape shared by SAT and TOEFL bulk import, whichever source
 * format (CSV/XLSX/JSON) it came from. Each exam's parser maps its own
 * column names into this shape; each exam's validator only looks at the
 * fields relevant to it. Options use option_a..e columns (matching the
 * existing WAEC/UTME question-bank CSV convention in question-csv.ts)
 * rather than a single free-text "options" column — easier to validate
 * and template consistently across both exams. */
export type NormalizedImportRow = {
  rowNumber: number;
  externalId: string; // question_id

  // SAT: section = READING_WRITING|MATH. TOEFL: section = the skill
  // (READING|LISTENING|SPEAKING|WRITING) — one column serves both, since
  // no row is ever both exams at once.
  section: string;
  domain: string; // SAT only
  skill: string; // SAT: sub-skill free text. TOEFL: also used as taskType.
  difficulty: string;
  questionType: string; // MULTIPLE_CHOICE | STUDENT_PRODUCED_RESPONSE | SPEAKING_PROMPT | WRITING_PROMPT

  // Shared-stimulus grouping. A contentSetExternalId that repeats across
  // rows links them to the same SatContentSet/ToeflContentSet; the FIRST
  // row to introduce a given id supplies its passage/audio fields, later
  // rows referencing the same id only need the id itself.
  contentSetExternalId: string;
  contentSetOrder: string;
  passageTitle: string;
  passageText: string; // stimulus_text / passage_text
  imageUrl: string; // stimulus_image
  audioUrl: string;
  audioTranscript: string;

  prompt: string; // question_text
  options: { key: string; text: string }[];
  correctOption: string;
  correctValue: string; // SAT student-produced-response numeric answer
  explanation: string;
  calculatorAllowed: string;
  estimatedTimeSec: string;
  tags: string;
  status: string;

  // Content-safety metadata (spec section 10).
  sourceType: string;
  author: string;
  license: string;
  sourceReference: string;
  createdByAi: string;
};

export function emptyGetter(cells: Record<string, string>) {
  return (name: string) => (cells[name] ?? "").trim();
}

const OPTION_KEYS = ["A", "B", "C", "D", "E"];

export function optionsFromRecord(cells: Record<string, string>): { key: string; text: string }[] {
  const get = emptyGetter(cells);
  return OPTION_KEYS.map((key) => ({ key, text: get(`option_${key.toLowerCase()}`) })).filter(
    (o) => o.text.length > 0
  );
}

/** Maps one raw record (already header->value, from CSV/XLSX/JSON alike)
 * into the shared normalized shape. `section` reads from the SAT `section`
 * column or the TOEFL `section`/`skill` column, whichever is present. */
export function normalizeRow(cells: Record<string, string>, rowNumber: number): NormalizedImportRow {
  const get = emptyGetter(cells);
  return {
    rowNumber,
    externalId: get("question_id"),
    section: (get("section") || get("skill")).toUpperCase(),
    domain: get("domain"),
    skill: get("skill"),
    difficulty: get("difficulty").toUpperCase(),
    questionType: get("question_type").toUpperCase(),
    contentSetExternalId: get("content_set_id").toUpperCase(),
    contentSetOrder: get("content_set_order"),
    passageTitle: get("passage_title"),
    passageText: get("passage_text") || get("stimulus_text"),
    imageUrl: get("stimulus_image") || get("image_url"),
    audioUrl: get("audio_url"),
    audioTranscript: get("audio_transcript"),
    prompt: get("question_text"),
    options: optionsFromRecord(cells),
    correctOption: get("correct_answer").toUpperCase(),
    correctValue: get("correct_answer"),
    explanation: get("answer_explanation"),
    calculatorAllowed: get("calculator_allowed"),
    estimatedTimeSec: get("estimated_time"),
    tags: get("tags"),
    status: get("status").toUpperCase() || "DRAFT",
    sourceType: get("content_origin").toUpperCase() || get("source_type").toUpperCase(),
    author: get("author"),
    license: get("license"),
    sourceReference: get("source_reference"),
    createdByAi: get("created_by_ai"),
  };
}

export function parseTags(tags: string): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function parseBoolean(value: string): boolean {
  return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
}
