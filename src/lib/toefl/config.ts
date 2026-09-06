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
    // Real TOEFL independent-speaking-task timing — a factual exam-format
    // parameter, same footing as WRITING's timing below.
    SPEAKING: { prepTimeSec: 15 as number | null, recordTimeSec: 45 as number | null },
    // Real TOEFL independent-writing-task timing/word-count minimum — a
    // factual exam-format parameter, not ETS's copyrighted question
    // content, so stating it directly is fine (same footing as the
    // 0-6 score scale above).
    WRITING: { timeSec: 1800 as number | null, minWords: 300 as number | null },
  },
} as const;
