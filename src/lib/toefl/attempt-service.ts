import { prisma } from "@/lib/prisma";
import { computeSkillScore, computeDiagnosticOverallScore } from "@/lib/toefl/scoring";
import { countWords } from "@/lib/toefl/text";
import { uploadAudio } from "@/lib/storage/blob-storage";
import { isSpeakingEvaluationConfigured } from "@/lib/toefl/speaking-evaluator";
import type { ToeflSkill } from "@prisma/client";

/** Every skill's practice attempt writes its score into a different
 * ToeflAttempt column — this is the one place that mapping lives, so
 * adding Speaking/Writing later only means adding two more entries here,
 * not touching every call site. Unit-tested for completeness in
 * tests/toefl/attempt-service.test.ts. */
export const SKILL_SCORE_FIELD: Record<ToeflSkill, "readingScore" | "listeningScore" | "speakingScore" | "writingScore"> = {
  READING: "readingScore",
  LISTENING: "listeningScore",
  SPEAKING: "speakingScore",
  WRITING: "writingScore",
};

export async function assertOwnedInProgressToeflAttempt(attemptId: string, userId: string) {
  const attempt = await prisma.toeflAttempt.findUnique({
    where: { id: attemptId },
    select: { userId: true, submittedAt: true },
  });
  if (!attempt || attempt.userId !== userId) {
    throw new Error("Attempt not found.");
  }
  if (attempt.submittedAt) {
    throw new Error("This attempt has already been submitted.");
  }
}

export async function createSkillPracticeAttempt(userId: string, skill: ToeflSkill): Promise<string> {
  const content = await prisma.toeflContent.findMany({
    where: { skill, status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
  });
  if (content.length === 0) {
    throw new Error("Practice content isn't available yet.");
  }

  const attempt = await prisma.toeflAttempt.create({
    data: {
      userId,
      kind: "SKILL_PRACTICE",
      skill,
      items: {
        create: content.map((c, i) => ({ contentId: c.id, order: i })),
      },
    },
  });

  return attempt.id;
}

/** Combines all published content across all 4 skills into a single
 * attempt — Reading/Listening items first (all of them, for a real MCQ
 * score), then one Writing prompt and one Speaking prompt for a full-skill
 * preview. `skill: null` marks it as covering all 4 skills, per the
 * schema's own comment on that field. Skips any skill with zero published
 * content rather than failing outright — only errors if literally nothing
 * exists anywhere yet. */
export async function createDiagnosticAttempt(userId: string): Promise<string> {
  const [reading, listening, writing, speaking] = await Promise.all([
    prisma.toeflContent.findMany({ where: { skill: "READING", status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
    prisma.toeflContent.findMany({ where: { skill: "LISTENING", status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
    prisma.toeflContent.findFirst({ where: { skill: "WRITING", status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
    prisma.toeflContent.findFirst({ where: { skill: "SPEAKING", status: "PUBLISHED" }, orderBy: { createdAt: "asc" } }),
  ]);
  const ordered = [...reading, ...listening, ...(writing ? [writing] : []), ...(speaking ? [speaking] : [])];
  if (ordered.length === 0) {
    throw new Error("Diagnostic content isn't available yet.");
  }

  const attempt = await prisma.toeflAttempt.create({
    data: {
      userId,
      kind: "DIAGNOSTIC",
      skill: null,
      items: { create: ordered.map((c, i) => ({ contentId: c.id, order: i })) },
    },
  });

  return attempt.id;
}

/** Reading/Listening bundle every published item into one attempt (answer
 * a set of N). Writing and Speaking don't — a student picks exactly one
 * prompt, responds, submits — so this creates a single-item attempt
 * instead. Shared here (not duplicated per skill) since Speaking needs
 * the identical shape in the next step. */
export async function createSingleItemAttempt(userId: string, skill: ToeflSkill, contentId: string): Promise<string> {
  const content = await prisma.toeflContent.findUnique({ where: { id: contentId } });
  if (!content || content.status !== "PUBLISHED" || content.skill !== skill) {
    throw new Error("That prompt isn't available.");
  }

  const attempt = await prisma.toeflAttempt.create({
    data: {
      userId,
      kind: "SKILL_PRACTICE",
      skill,
      items: { create: [{ contentId, order: 0 }] },
    },
  });

  return attempt.id;
}

/** Shared save-answer logic for MCQ skills (Reading, Listening). Speaking
 * and Writing record free-form responses instead and will need their own
 * recording functions when those steps land. */
export async function recordMcqAnswer(itemId: string, userId: string, selectedOption: string) {
  const item = await prisma.toeflAttemptItem.findUniqueOrThrow({
    where: { id: itemId },
    include: {
      attempt: { select: { id: true, userId: true, submittedAt: true } },
      content: { select: { correctOption: true } },
    },
  });
  if (item.attempt.userId !== userId) throw new Error("Attempt not found.");
  if (item.attempt.submittedAt) throw new Error("This attempt has already been submitted.");

  await prisma.toeflAttemptItem.update({
    where: { id: itemId },
    data: { selectedOption, isCorrect: selectedOption === item.content.correctOption },
  });
}

export async function submitSkillAttempt(attemptId: string, userId: string, skill: ToeflSkill) {
  await assertOwnedInProgressToeflAttempt(attemptId, userId);

  const items = await prisma.toeflAttemptItem.findMany({ where: { attemptId } });
  const correctCount = items.filter((i) => i.isCorrect).length;
  const score = computeSkillScore(correctCount, items.length);

  await prisma.toeflAttempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date(), [SKILL_SCORE_FIELD[skill]]: score },
  });
}

export async function saveWritingDraft(itemId: string, userId: string, text: string) {
  const item = await prisma.toeflAttemptItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { attempt: { select: { userId: true, submittedAt: true } } },
  });
  if (item.attempt.userId !== userId) throw new Error("Attempt not found.");
  if (item.attempt.submittedAt) throw new Error("This attempt has already been submitted.");

  await prisma.toeflAttemptItem.update({
    where: { id: itemId },
    data: { writingText: text, writingWordCount: countWords(text) },
  });
}

/** No score is computed here — Writing and Speaking both have no
 * automated evaluator yet (Step 13). Marking every item UNAVAILABLE
 * rather than leaving evalStatus at its NOT_EVALUATED default makes the
 * "no automated feedback yet" state explicit and queryable, not just an
 * absence of data. Named generically since this has no writing-specific
 * logic — Speaking's submission (after its own audio upload step) calls
 * this too. */
export async function submitFreeformAttempt(attemptId: string, userId: string) {
  await assertOwnedInProgressToeflAttempt(attemptId, userId);

  await prisma.toeflAttemptItem.updateMany({
    where: { attemptId },
    data: { evalStatus: "UNAVAILABLE" },
  });
  await prisma.toeflAttempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date() },
  });
}

/** Shared by Speaking's own submit action and Diagnostic's — uploads the
 * recording and updates the item. Deliberately does NOT touch
 * attempt.submittedAt: Speaking's standalone flow finalizes right after
 * calling this, but Diagnostic's multi-skill attempt isn't done yet when
 * its Speaking section finishes uploading. */
export async function saveSpeakingRecording(
  itemId: string,
  userId: string,
  opts: { data: Uint8Array; contentType: string; durationSec: number }
) {
  const item = await prisma.toeflAttemptItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { attempt: { select: { userId: true, submittedAt: true } } },
  });
  if (item.attempt.userId !== userId) throw new Error("Attempt not found.");
  if (item.attempt.submittedAt) throw new Error("This attempt has already been submitted.");

  const { url } = await uploadAudio({
    pathname: `toefl/speaking/${itemId}.webm`,
    data: opts.data,
    contentType: opts.contentType,
  });

  await prisma.toeflAttemptItem.update({
    where: { id: itemId },
    data: {
      speakingAudioUrl: url,
      speakingDurationSec: opts.durationSec,
      evalStatus: isSpeakingEvaluationConfigured() ? "NOT_EVALUATED" : "UNAVAILABLE",
    },
  });
}

/** Reading/Listening scores come from real correctness, same formula as
 * submitSkillAttempt. Writing/Speaking items are marked UNAVAILABLE (no
 * fake score) — overallScore only ever averages skills that were
 * actually auto-scored, via computeDiagnosticOverallScore. */
export async function submitDiagnosticAttempt(attemptId: string, userId: string) {
  await assertOwnedInProgressToeflAttempt(attemptId, userId);

  const items = await prisma.toeflAttemptItem.findMany({ where: { attemptId }, include: { content: true } });
  const readingItems = items.filter((i) => i.content.skill === "READING");
  const listeningItems = items.filter((i) => i.content.skill === "LISTENING");
  const freeformIds = items
    .filter((i) => i.content.skill === "WRITING" || i.content.skill === "SPEAKING")
    .map((i) => i.id);

  const readingScore = readingItems.length
    ? computeSkillScore(readingItems.filter((i) => i.isCorrect).length, readingItems.length)
    : null;
  const listeningScore = listeningItems.length
    ? computeSkillScore(listeningItems.filter((i) => i.isCorrect).length, listeningItems.length)
    : null;
  const overallScore = computeDiagnosticOverallScore([readingScore, listeningScore]);

  if (freeformIds.length) {
    await prisma.toeflAttemptItem.updateMany({
      where: { id: { in: freeformIds } },
      data: { evalStatus: "UNAVAILABLE" },
    });
  }

  await prisma.toeflAttempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date(), readingScore, listeningScore, overallScore },
  });
}
