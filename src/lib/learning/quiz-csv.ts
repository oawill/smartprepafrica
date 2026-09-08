const OPTION_KEYS = ["A", "B", "C", "D"];

export type ParsedQuizRow =
  | { ok: true; prompt: string; options: { key: string; text: string }[]; correctOption: string }
  | { ok: false; reason: string };

/** Parses one CSV row of shape prompt,optionA,optionB,optionC,optionD,correctOption
 * into a QuizQuestion-ready shape, or a reason it was rejected. Pure — no I/O —
 * so the row-validation logic is testable without a database, matching the
 * "test the pure logic, not the Server Action" convention already used for
 * canEnrollInCourse (src/lib/learning/course-access.ts). */
export function parseQuizCsvRow(row: string[]): ParsedQuizRow {
  const [prompt, optionA, optionB, optionC, optionD, correctOptionRaw] = row.map((c) => c?.trim());

  if (!prompt) return { ok: false, reason: "Missing question prompt." };

  const optionTexts = [optionA, optionB, optionC, optionD];
  if (optionTexts.some((t) => !t)) {
    return { ok: false, reason: "Missing one or more options (need all 4: A, B, C, D)." };
  }

  const correctOption = correctOptionRaw?.toUpperCase();
  if (!correctOption || !OPTION_KEYS.includes(correctOption)) {
    return {
      ok: false,
      reason: `Correct option must be one of A/B/C/D, got "${correctOptionRaw ?? ""}".`,
    };
  }

  return {
    ok: true,
    prompt,
    options: optionTexts.map((text, i) => ({ key: OPTION_KEYS[i], text: text! })),
    correctOption,
  };
}
