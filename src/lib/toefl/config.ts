/** Same isXConfigured() gate shape used throughout this codebase
 * (isAiCoachConfigured, isVoiceConfigured, isRemotionConfigured, etc.) —
 * everything TOEFL-related checks this before rendering or linking to
 * itself, so leaving ENABLE_TOEFL unset/false reproduces the app exactly
 * as it behaved before TOEFL existed. */
export function isToeflEnabled(): boolean {
  return process.env.ENABLE_TOEFL === "true";
}

/** Centralized TOEFL configuration. Section timings/question limits are
 * filled in incrementally as each skill module is actually built
 * (Reading, Listening, Writing, Speaking) — this shape exists now so
 * later phases extend it rather than redesign it. */
export const TOEFL_CONFIG = {
  scoreScale: { min: 0, max: 6 },
  skills: ["READING", "LISTENING", "SPEAKING", "WRITING"] as const,
  sections: {
    READING: { defaultTimeSec: null as number | null, defaultQuestionCount: null as number | null },
    LISTENING: { defaultTimeSec: null as number | null, defaultQuestionCount: null as number | null },
    SPEAKING: { prepTimeSec: null as number | null, recordTimeSec: null as number | null },
    WRITING: { timeSec: null as number | null, minWords: null as number | null },
  },
} as const;
