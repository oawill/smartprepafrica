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
};
