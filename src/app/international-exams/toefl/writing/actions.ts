"use server";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isToeflEnabled } from "@/lib/toefl/config";
import { createSingleItemAttempt, saveWritingDraft, submitFreeformAttempt } from "@/lib/toefl/attempt-service";

export async function startWritingPractice(contentId: string) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const attemptId = await createSingleItemAttempt(session.user.id, "WRITING", contentId);
  redirect(`/international-exams/toefl/writing/session/${attemptId}`);
}

export async function saveWritingDraftAction(itemId: string, text: string) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  await saveWritingDraft(itemId, session.user.id, text);
}

export async function submitWritingAttemptAction(attemptId: string) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  await submitFreeformAttempt(attemptId, session.user.id);
  redirect(`/international-exams/toefl/writing/results/${attemptId}`);
}
