import type { ExamType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { examLabels } from "@/lib/exam-slugs";
import {
  startAttemptForUser,
  saveAnswerForUser,
  submitAttemptForUser,
} from "@/lib/practice/attempt-service";

const EXAM_CHOICES: { number: string; exam: ExamType }[] = [
  { number: "1", exam: "WAEC" },
  { number: "2", exam: "UTME" },
  { number: "3", exam: "NECO" },
  { number: "4", exam: "POST_UTME" },
];

export const EXAM_PREP_PROMPT = `📚 Exam Prep
Choose an exam:

1️⃣ WAEC
2️⃣ UTME/JAMB
3️⃣ NECO
4️⃣ Post-UTME`;

export function parseExamChoice(body: string): ExamType | null {
  const normalized = body.trim().toLowerCase();
  const byNumber = EXAM_CHOICES.find((c) => c.number === normalized);
  if (byNumber) return byNumber.exam;
  if (normalized === "waec") return "WAEC";
  if (normalized === "neco") return "NECO";
  if (["utme", "jamb", "utme/jamb"].includes(normalized)) return "UTME";
  if (["post-utme", "post utme", "postutme"].includes(normalized)) return "POST_UTME";
  return null;
}

export type SubjectChoice = { id: string; name: string };

/** Same query shape as src/app/practice/[exam]/page.tsx's subject
 * listing — subjects with at least one published question for this
 * exam, from the existing database, never hard-coded. */
export async function getSubjectsForExam(exam: ExamType): Promise<SubjectChoice[]> {
  const subjects = await prisma.subject.findMany({
    where: { questions: { some: { exam, status: "PUBLISHED" } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return subjects;
}

export function formatSubjectListPrompt(exam: ExamType, subjects: SubjectChoice[]): string {
  const lines = subjects.map((s, i) => `${i + 1}. ${s.name}`).join("\n");
  return `${examLabels[exam]} Exam Prep\nChoose a subject:\n\n${lines}`;
}

export function parseSubjectChoice(body: string, subjects: SubjectChoice[]): SubjectChoice | null {
  const normalized = body.trim().toLowerCase();
  const byNumber = Number(normalized);
  if (Number.isInteger(byNumber) && byNumber >= 1 && byNumber <= subjects.length) {
    return subjects[byNumber - 1];
  }
  return subjects.find((s) => s.name.toLowerCase() === normalized) ?? null;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function parseOptionChoice(body: string): string | null {
  const normalized = body.trim().toUpperCase();
  return OPTION_LETTERS.includes(normalized) ? normalized : null;
}

type QuestionForPrompt = {
  id: string;
  prompt: string;
  options: unknown;
  subjectName: string;
};

/** Starts a new attempt for one subject and returns the first
 * question to send — reuses startAttemptForUser exactly as the web
 * /practice flow does, just with a small fixed count suited to a
 * WhatsApp session and channel: "whatsapp" for admin reporting. */
export async function startExamPrepSession(
  userId: string,
  exam: ExamType,
  subjectId: string
): Promise<{ attemptId: string; question: QuestionForPrompt } | null> {
  const attempt = await startAttemptForUser(userId, {
    exam,
    mode: "STUDY_DRILL",
    subjectIds: [subjectId],
    requestedCount: 5,
    channel: "whatsapp",
  });

  const question = await getCurrentQuestion(attempt.id);
  if (!question) return null;
  return { attemptId: attempt.id, question };
}

/** The next unanswered question in this attempt, in the original
 * selection order — WhatsApp delivers one question at a time. */
export async function getCurrentQuestion(attemptId: string): Promise<QuestionForPrompt | null> {
  const response = await prisma.questionResponse.findFirst({
    where: { attemptId, selectedOption: null },
    orderBy: { order: "asc" },
    include: { question: { select: { id: true, prompt: true, options: true, subject: { select: { name: true } } } } },
  });
  if (!response) return null;
  return {
    id: response.question.id,
    prompt: response.question.prompt,
    options: response.question.options,
    subjectName: response.question.subject.name,
  };
}

export function formatQuestionPrompt(question: QuestionForPrompt): string {
  const options = question.options as { key: string; text: string }[];
  const optionLines = options.map((o) => `${o.key}. ${o.text}`).join("\n");
  return `🧠 ${question.subjectName} Practice\n${question.prompt}\n\n${optionLines}\n\nReply ${options
    .map((o) => o.key)
    .join(", ")}.`;
}

export type AnswerResult = {
  isCorrect: boolean;
  explanation: string | null;
  nextQuestion: QuestionForPrompt | null;
  finished: boolean;
  summary?: { score: number; correctCount: number; totalItems: number };
};

/** Records the answer, then either returns the next question or —
 * once every question in the attempt has been answered — submits it
 * (same submitAttemptForUser the web results page uses: XP, parent
 * notification for mock exams, mastery recording) and returns a
 * summary instead. */
export async function answerCurrentQuestion(
  userId: string,
  attemptId: string,
  questionId: string,
  selectedOption: string
): Promise<AnswerResult> {
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    select: { explanation: true },
  });

  const { isCorrect } = await saveAnswerForUser(userId, attemptId, questionId, selectedOption);

  const nextQuestion = await getCurrentQuestion(attemptId);
  if (nextQuestion) {
    return { isCorrect, explanation: question.explanation, nextQuestion, finished: false };
  }

  const summary = await submitAttemptForUser(userId, attemptId);
  return { isCorrect, explanation: question.explanation, nextQuestion: null, finished: true, summary };
}

export function formatSummary(summary: { score: number; correctCount: number; totalItems: number }): string {
  return `🏁 Session complete!\n\n${summary.correctCount} / ${summary.totalItems} correct (${Math.round(
    summary.score
  )}%)\n\nReply MENU to keep going.`;
}
