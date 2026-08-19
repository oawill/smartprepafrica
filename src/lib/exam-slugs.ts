import type { ExamType } from "@prisma/client";

export const examSlugs: Record<string, ExamType> = {
  waec: "WAEC",
  neco: "NECO",
  utme: "UTME",
  "post-utme": "POST_UTME",
};

export const examLabels: Record<ExamType, string> = {
  WAEC: "WAEC",
  NECO: "NECO",
  UTME: "UTME",
  POST_UTME: "Post-UTME",
};

export function examSlugFor(exam: ExamType): string {
  return (
    Object.entries(examSlugs).find(([, value]) => value === exam)?.[0] ??
    exam.toLowerCase()
  );
}
