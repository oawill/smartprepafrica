import type { AiCoachMode } from "@prisma/client";

export type { CoachFocusQuestion } from "@/lib/ai/focus-question";

export type CoachLaunchContext = {
  courseId?: string | null;
  lessonId?: string | null;
  chapterId?: string | null;
};

export const MODE_LABELS: Record<AiCoachMode, string> = {
  ASK: "Ask",
  EXPLAIN: "Explain",
  PRACTICE: "Practice",
  QUIZ_ME: "Quiz Me",
  STUDY_PLAN: "Study Plan",
  EXAM_PREP: "Exam Prep",
};

export type QuickAction = { label: string; prompt: string };

export const QUICK_ACTIONS: QuickAction[] = [
  { label: "Explain this", prompt: "Explain this in simple terms." },
  { label: "Simplify this", prompt: "Can you simplify that explanation even more?" },
  { label: "Show another example", prompt: "Show me another example." },
  { label: "Give me a hint", prompt: "Give me a hint, don't tell me the answer yet." },
  { label: "Quiz me", prompt: "Quiz me on this." },
  { label: "Why is this wrong?", prompt: "Why is this wrong?" },
  { label: "Show the formula", prompt: "What's the formula for this?" },
  { label: "Exam tip", prompt: "Give me an exam tip for this topic." },
];

/** The exact label the "I'm Confused" action must use, in both the lesson
 * quick-actions set below and coach-panel.tsx's escalation-tracking logic —
 * kept as a shared constant so the two can never drift out of sync. */
export const IM_CONFUSED_LABEL = "I'm Confused";

export const LESSON_QUICK_ACTIONS: QuickAction[] = [
  { label: "Explain Simply", prompt: "Explain this simply." },
  { label: "Explain Again", prompt: "Explain that again, a different way." },
  { label: "Give an Example", prompt: "Give me an example." },
  { label: "Step-by-Step", prompt: "Walk me through this step by step." },
  { label: IM_CONFUSED_LABEL, prompt: "I'm confused." },
  { label: "Quiz Me", prompt: "Quiz me on what I just watched." },
  { label: "Exam Tip", prompt: "Give me an exam tip for this topic." },
  { label: "Summarize This Chapter", prompt: "Summarize this chapter." },
];
