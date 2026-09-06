"use server";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSatEnabled } from "@/lib/sat/config";
import { createSkillPracticeAttempt, recordAnswer, submitSkillAttempt } from "@/lib/sat/attempt-service";

export async function startMathPractice() {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const attemptId = await createSkillPracticeAttempt(session.user.id, "MATH");
  redirect(`/international-exams/sat/math/session/${attemptId}`);
}

export async function saveMathAnswer(itemId: string, answer: { selectedOption?: string; numericAnswer?: string }) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  await recordAnswer(itemId, session.user.id, answer);
}

export async function submitMathAttempt(attemptId: string) {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  await submitSkillAttempt(attemptId, session.user.id, "MATH");
  redirect(`/international-exams/sat/math/results/${attemptId}`);
}
