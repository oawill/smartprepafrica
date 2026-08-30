import type { ExamType } from "@prisma/client";

/** The legacy ExamType enum doesn't match the new Exam.code values 1:1
 * (WAEC -> WASSCE, NECO -> SSCE) — this is the single source of truth for
 * that mapping, mirrored by scripts/backfill-country-refs.ts and
 * scripts/seed-country-exam-subjects.ts at the data layer. */
export const EXAM_TYPE_TO_EXAM_CODE: Record<ExamType, string> = {
  WAEC: "WASSCE",
  NECO: "SSCE",
  UTME: "UTME",
  POST_UTME: "POST_UTME",
};

export const EXAM_CODE_TO_EXAM_TYPE: Record<string, ExamType> = Object.fromEntries(
  Object.entries(EXAM_TYPE_TO_EXAM_CODE).map(([examType, examCode]) => [examCode, examType])
) as Record<string, ExamType>;
