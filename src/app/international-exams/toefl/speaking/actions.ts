"use server";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isToeflEnabled } from "@/lib/toefl/config";
import { createSingleItemAttempt } from "@/lib/toefl/attempt-service";
import { isSpeakingEvaluationConfigured } from "@/lib/toefl/speaking-evaluator";
import { uploadAudio } from "@/lib/storage/blob-storage";

export async function startSpeakingPractice(contentId: string) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const attemptId = await createSingleItemAttempt(session.user.id, "SPEAKING", contentId);
  redirect(`/international-exams/toefl/speaking/session/${attemptId}`);
}

export async function submitSpeakingRecording(itemId: string, formData: FormData) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const item = await prisma.toeflAttemptItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { attempt: { select: { id: true, userId: true, submittedAt: true } } },
  });
  if (item.attempt.userId !== session.user.id) throw new Error("Attempt not found.");
  if (item.attempt.submittedAt) throw new Error("This attempt has already been submitted.");

  const audio = formData.get("audio");
  if (!(audio instanceof File)) throw new Error("No recording was received.");
  const durationSec = Number(formData.get("durationSec")) || 0;

  const data = new Uint8Array(await audio.arrayBuffer());
  const { url } = await uploadAudio({
    pathname: `toefl/speaking/${itemId}.webm`,
    data,
    contentType: audio.type || "audio/webm",
  });

  await prisma.toeflAttemptItem.update({
    where: { id: itemId },
    data: {
      speakingAudioUrl: url,
      speakingDurationSec: durationSec,
      // Distinguishes "no evaluator exists at all" (this case, always
      // true today) from a future "evaluator exists but hasn't run yet"
      // (NOT_EVALUATED) — same enum, different meaning, per Phase 1's
      // own documented distinction.
      evalStatus: isSpeakingEvaluationConfigured() ? "NOT_EVALUATED" : "UNAVAILABLE",
    },
  });

  // Not reusing submitFreeformAttempt here — it unconditionally sets
  // every item's evalStatus to UNAVAILABLE, which would clobber the
  // more precise status just set above (relevant once Step 13 makes
  // isSpeakingEvaluationConfigured() sometimes true).
  await prisma.toeflAttempt.update({
    where: { id: item.attempt.id },
    data: { submittedAt: new Date() },
  });
  redirect(`/international-exams/toefl/speaking/results/${item.attempt.id}`);
}
