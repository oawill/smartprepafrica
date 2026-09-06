import type { ToeflSkill, ToeflAttemptKind } from "@prisma/client";

export type { ToeflSkill, ToeflAttemptKind };

export const TOEFL_SKILLS: ToeflSkill[] = ["READING", "LISTENING", "SPEAKING", "WRITING"];

export const TOEFL_SKILL_LABELS: Record<ToeflSkill, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  SPEAKING: "Speaking",
  WRITING: "Writing",
};

/** Per-skill readiness view model for the dashboard. `null` means no
 * attempt data exists yet — the UI must render an honest empty state,
 * never a fabricated number. */
export type ToeflReadinessSummary = {
  overall: number | null;
  reading: number | null;
  listening: number | null;
  speaking: number | null;
  writing: number | null;
  strongestSkill: ToeflSkill | null;
  weakestSkill: ToeflSkill | null;
  studyStreakDays: number;
  questionsCompleted: number;
  practiceTimeMinutes: number;
  recentAttempts: {
    id: string;
    kind: ToeflAttemptKind;
    skill: ToeflSkill | null;
    submittedAt: Date | null;
    overallScore: number | null;
  }[];
};
