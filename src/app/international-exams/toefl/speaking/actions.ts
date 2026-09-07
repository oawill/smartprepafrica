"use server";

import { redirect, notFound } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { isToeflEnabled } from "@/lib/toefl/config";
import { createSingleItemAttempt, saveSpeakingRecording } from "@/lib/toefl/attempt-service";

export async function startSpeakingPractice(contentId: string) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const attemptId = await createSingleItemAttempt(session.user.id, "SPEAKING", contentId);
  redirect(`/international-exams/toefl/speaking/session/${attemptId}`);
}

export async function submitSpeakingRecording(itemId: string, formData: FormData) {
  if (!isToeflEnabled()) notFound();
  const session = await requireStudentSession();
  await requireExamProductEntitlement(session.user.id, "TOEFL");

  const audio = formData.get("audio");
  if (!(audio instanceof File)) throw new Error("No recording was received.");
  const durationSec = Number(formData.get("durationSec")) || 0;
  const data = new Uint8Array(await audio.arrayBuffer());

  const item = await prisma.toeflAttemptItem.findUniqueOrThrow({ where: { id: itemId }, select: { attemptId: true } });
  await saveSpeakingRecording(itemId, session.user.id, { data, contentType: audio.type || "audio/webm", durationSec });

  // Standalone Speaking is a single-item attempt, so this section's
  // upload finishing means the whole attempt is done — unlike Diagnostic,
  // which reuses saveSpeakingRecording but finalizes via
  // submitDiagnosticAttempt instead, since more sections may still exist.
  await prisma.toeflAttempt.update({
    where: { id: item.attemptId },
    data: { submittedAt: new Date() },
  });
  redirect(`/international-exams/toefl/speaking/results/${item.attemptId}`);
}
