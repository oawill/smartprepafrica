/** Shared shape for "explain this specific question" AI Help requests.
 * Dependency-free (no Prisma import) so it's safe to import from both
 * server code (context-builder) and client components (coach-panel). */
export type CoachFocusQuestion = {
  prompt: string;
  studentAnswer: string | null;
  correctAnswer: string;
  explanation: string | null;
  topic: string | null;
  passage?: {
    type: string;
    title: string | null;
    bodyText: string;
    lineRef: string | null;
  } | null;
  /** Set for SAT Math questions — tells buildSystemPrompt to stage a
   * "Give me a hint" request across three escalating hints (concept,
   * setup, next step) rather than explaining the full solution
   * immediately, per the spec's explicit "never reveal the answer
   * right away" requirement. Left unset everywhere else. */
  progressiveHints?: boolean;
};
