import { prisma } from "@/lib/prisma";
import { computeSkillScore } from "@/lib/toefl/scoring";
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
