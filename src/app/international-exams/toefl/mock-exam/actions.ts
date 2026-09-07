"use server";

import { redirect, notFound } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { isToeflEnabled } from "@/lib/toefl/config";
import {
  createMockExamAttempt,
  recordMcqAnswer,
  saveSpeakingRecording,
  submitExamAttempt,
} from "@/lib/toefl/attempt-service";
import { prisma } from "@/lib/prisma";

export async function startMockExam() {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const attemptId = await createMockExamAttempt(session.user.id);
  redirect(`/international-exams/toefl/mock-exam/session/${attemptId}`);
}

export async function saveMockExamAnswer(itemId: string, selectedOption: string) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  await recordMcqAnswer(itemId, session.user.id, selectedOption);
}

/** Uploads a non-final Speaking item's recording without finalizing the
 * exam — Mock Exam walks through every published Speaking prompt, not
 * just one, so only the LAST one triggers finalization. */
export async function saveMockExamSpeakingRecording(itemId: string, formData: FormData) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const audio = formData.get("audio");
  if (!(audio instanceof File)) throw new Error("No recording was received.");
  const durationSec = Number(formData.get("durationSec")) || 0;
  const data = new Uint8Array(await audio.arrayBuffer());

  await saveSpeakingRecording(itemId, session.user.id, { data, contentType: audio.type || "audio/webm", durationSec });
}

/** Normal finish path — the last Speaking item's upload completing means
 * the whole mock exam is done. */
export async function submitMockExamSpeakingRecording(itemId: string, formData: FormData) {
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
  redirect(`/international-exams/toefl/mock-exam/results/${item.attemptId}`);
}

/** Defensive fallback only — used by the client runner if the content
 * pool is incomplete (e.g. no Speaking prompt published yet) or a
 * section's hard countdown expires with no further phase to advance to,
 * so the flow can still finish instead of dead-ending. */
export async function finalizeMockExam(attemptId: string) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  await submitExamAttempt(attemptId, session.user.id);
  redirect(`/international-exams/toefl/mock-exam/results/${attemptId}`);
}
