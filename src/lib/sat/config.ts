/** Same isXConfigured() gate shape used throughout this codebase
 * (isToeflEnabled, isAiCoachConfigured, isVoiceConfigured, etc.) —
 * everything SAT-related checks this before rendering or linking to
 * itself, so leaving ENABLE_SAT unset/false reproduces the app exactly
 * as it behaved before SAT existed. */
export function isSatEnabled(): boolean {
  return process.env.ENABLE_SAT === "true";
}

/** Centralized SAT configuration — section score scale for now; timing
 * constants (Module/Mock Exam durations) get added in the Mock Exam
 * phase rather than invented ahead of need. */
export const SAT_CONFIG = {
  scoreScale: {
    compositeMin: 400,
    compositeMax: 1600,
    sectionMin: 200,
    sectionMax: 800,
  },
  sections: ["READING_WRITING", "MATH"] as const,
} as const;
