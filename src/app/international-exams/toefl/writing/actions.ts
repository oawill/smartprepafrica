"use server";

import { redirect, notFound } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { isToeflEnabled } from "@/lib/toefl/config";
import { createSingleItemAttempt, saveWritingDraft, submitFreeformAttempt } from "@/lib/toefl/attempt-service";

export async function startWritingPractice(contentId: string) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const attemptId = await createSingleItemAttempt(session.user.id, "WRITING", contentId);
  redirect(`/international-exams/toefl/writing/session/${attemptId}`);
}

export async function saveWritingDraftAction(itemId: string, text: string) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  await saveWritingDraft(itemId, session.user.id, text);
}

export async function submitWritingAttemptAction(attemptId: string) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  await submitFreeformAttempt(attemptId, session.user.id);
  redirect(`/international-exams/toefl/writing/results/${attemptId}`);
}
