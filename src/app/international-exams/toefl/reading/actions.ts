"use server";

import { redirect, notFound } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { isToeflEnabled } from "@/lib/toefl/config";
import { createSkillPracticeAttempt, recordMcqAnswer, submitSkillAttempt } from "@/lib/toefl/attempt-service";

export async function startReadingPractice() {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const attemptId = await createSkillPracticeAttempt(session.user.id, "READING");
  redirect(`/international-exams/toefl/reading/session/${attemptId}`);
}

export async function saveReadingAnswer(itemId: string, selectedOption: string) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  await recordMcqAnswer(itemId, session.user.id, selectedOption);
}

export async function submitReadingAttempt(attemptId: string) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  await submitSkillAttempt(attemptId, session.user.id, "READING");
  redirect(`/international-exams/toefl/reading/results/${attemptId}`);
}
