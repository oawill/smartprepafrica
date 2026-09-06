import { prisma } from "@/lib/prisma";
import { computeSkillScore } from "@/lib/toefl/scoring";
import { countWords } from "@/lib/toefl/text";
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

/** No score is computed here — there's no writing evaluator yet (Step 13).
 * Marking the item UNAVAILABLE rather than leaving evalStatus at its
 * NOT_EVALUATED default makes the "no automated feedback yet" state
 * explicit and queryable, not just an absence of data. */
export async function submitWritingAttempt(attemptId: string, userId: string) {
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
