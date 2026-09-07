"use server";

import { redirect, notFound } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { isSatEnabled } from "@/lib/sat/config";
import { createDiagnosticAttempt, recordAnswer, submitDiagnosticAttempt } from "@/lib/sat/attempt-service";

export async function startSatDiagnostic() {
  if (!isSatEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "SAT");

  const attemptId = await createDiagnosticAttempt(session.user.id);
  redirect(`/international-exams/sat/diagnostic/session/${attemptId}`);
}

export async function saveDiagnosticAnswer(itemId: string, answer: { selectedOption?: string; numericAnswer?: string }) {
  if (!isSatEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "SAT");

  await recordAnswer(itemId, session.user.id, answer);
}

export async function submitSatDiagnostic(attemptId: string) {
  if (!isSatEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "SAT");

  await submitDiagnosticAttempt(attemptId, session.user.id);
  redirect(`/international-exams/sat/diagnostic/results/${attemptId}`);
}
