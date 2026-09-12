"use server";

import { redirect } from "next/navigation";
import type { AttemptMode, ExamType } from "@prisma/client";
import { auth } from "@/lib/auth";
import {
  startAttemptForUser,
  saveAnswerForUser,
  toggleFlagForUser,
  submitAttemptForUser,
} from "@/lib/practice/attempt-service";

export async function startAttempt(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const exam = formData.get("exam") as ExamType;
  const mode = formData.get("mode") as AttemptMode;
  const subjectIds = formData.getAll("subjects") as string[];
  const requestedCount = Number(formData.get("count")) || 10;
  const topic = (formData.get("topic") as string) || undefined;

  const attempt = await startAttemptForUser(session.user.id, {
    exam,
    mode,
    subjectIds,
    requestedCount,
    topic,
  });

  redirect(`/practice/session/${attempt.id}`);
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  selectedOption: string
) {
  const session = await auth();
  if (!session) redirect("/login");

  await saveAnswerForUser(session.user.id, attemptId, questionId, selectedOption);
}

export async function toggleFlag(
  attemptId: string,
  questionId: string,
  flagged: boolean
) {
  const session = await auth();
  if (!session) redirect("/login");

  await toggleFlagForUser(session.user.id, attemptId, questionId, flagged);
}

export async function submitAttempt(attemptId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  await submitAttemptForUser(session.user.id, attemptId);

  redirect(`/practice/results/${attemptId}`);
}
