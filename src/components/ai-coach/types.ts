import type { AiCoachMode } from "@prisma/client";

export type CoachLaunchContext = {
  courseId?: string | null;
  lessonId?: string | null;
};

export type CoachFocusQuestion = {
  prompt: string;
  studentAnswer: string | null;
  correctAnswer: string;
  explanation: string | null;
  topic: string | null;
};

export const MODE_LABELS: Record<AiCoachMode, string> = {
  ASK: "Ask",
  EXPLAIN: "Explain",
  PRACTICE: "Practice",
  QUIZ_ME: "Quiz Me",
  STUDY_PLAN: "Study Plan",
  EXAM_PREP: "Exam Prep",
};

export const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  { label: "Explain this", prompt: "Explain this in simple terms." },
  { label: "Simplify this", prompt: "Can you simplify that explanation even more?" },
  { label: "Show another example", prompt: "Show me another example." },
  { label: "Give me a hint", prompt: "Give me a hint, don't tell me the answer yet." },
  { label: "Quiz me", prompt: "Quiz me on this." },
  { label: "Why is this wrong?", prompt: "Why is this wrong?" },
  { label: "Show the formula", prompt: "What's the formula for this?" },
  { label: "Exam tip", prompt: "Give me an exam tip for this topic." },
];
