import type { SatSection, SatAttemptKind } from "@prisma/client";

export type { SatSection, SatAttemptKind };

export const SAT_SECTIONS: SatSection[] = ["READING_WRITING", "MATH"];

export const SAT_SECTION_LABELS: Record<SatSection, string> = {
  READING_WRITING: "Reading and Writing",
  MATH: "Math",
};

/** Per-section readiness view model for the dashboard. `null` means no
 * attempt data exists yet — the UI must render an honest empty state,
 * never a fabricated number. */
export type SatReadinessSummary = {
  overall: number | null;
  readingWriting: number | null;
  math: number | null;
  strongestDomain: string | null;
  weakestDomain: string | null;
  studyStreakDays: number;
  questionsCompleted: number;
  practiceTimeMinutes: number;
  recentAttempts: {
    id: string;
    kind: SatAttemptKind;
    section: SatSection | null;
    submittedAt: Date | null;
    overallScore: number | null;
  }[];
};
