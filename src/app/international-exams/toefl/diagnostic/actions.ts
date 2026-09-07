"use server";

import { redirect, notFound } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { isToeflEnabled } from "@/lib/toefl/config";
import {
  createDiagnosticAttempt,
  recordMcqAnswer,
  saveSpeakingRecording,
  submitExamAttempt,
} from "@/lib/toefl/attempt-service";
import { prisma } from "@/lib/prisma";

export async function startDiagnosticTest() {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const attemptId = await createDiagnosticAttempt(session.user.id);
  redirect(`/international-exams/toefl/diagnostic/session/${attemptId}`);
}

export async function saveDiagnosticAnswer(itemId: string, selectedOption: string) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  await recordMcqAnswer(itemId, session.user.id, selectedOption);
}

/** Normal finish path — Speaking is the last section whenever a Speaking
 * prompt was published, so its upload completing means the whole
 * diagnostic attempt is done. */
export async function submitDiagnosticSpeakingRecording(itemId: string, formData: FormData) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const audio = formData.get("audio");
  if (!(audio instanceof File)) throw new Error("No recording was received.");
  const durationSec = Number(formData.get("durationSec")) || 0;
  const data = new Uint8Array(await audio.arrayBuffer());

  const item = await prisma.toeflAttemptItem.findUniqueOrThrow({ where: { id: itemId }, select: { attemptId: true } });
  await saveSpeakingRecording(itemId, session.user.id, { data, contentType: audio.type || "audio/webm", durationSec });
  await submitExamAttempt(item.attemptId, session.user.id);
  redirect(`/international-exams/toefl/diagnostic/results/${item.attemptId}`);
}

/** Defensive fallback only — used by the client runner if the content
 * pool is incomplete (e.g. no Speaking prompt published yet), so the
 * flow can still finish instead of dead-ending on a phase that never
 * existed. */
export async function finalizeDiagnosticAttempt(attemptId: string) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  await submitExamAttempt(attemptId, session.user.id);
  redirect(`/international-exams/toefl/diagnostic/results/${attemptId}`);
}
