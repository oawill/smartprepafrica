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
  // A diagnostic is meant to be short (spec: "shortened diagnostic"), not
  // the full published bank — caps each section independently so the
  // diagnostic stays quick even as the content library grows.
  diagnosticItemsPerSection: 8,
} as const;
