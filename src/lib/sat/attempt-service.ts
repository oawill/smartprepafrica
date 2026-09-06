import { prisma } from "@/lib/prisma";
import { computeSectionScore } from "@/lib/sat/scoring";
import type { SatSection } from "@prisma/client";

/** Every section's practice attempt writes its score into a different
 * SatAttempt column — the one place that mapping lives, mirroring
 * src/lib/toefl/attempt-service.ts's SKILL_SCORE_FIELD. */
export const SECTION_SCORE_FIELD: Record<SatSection, "readingWritingScore" | "mathScore"> = {
  READING_WRITING: "readingWritingScore",
  MATH: "mathScore",
};

export async function assertOwnedInProgressSatAttempt(attemptId: string, userId: string) {
  const attempt = await prisma.satAttempt.findUnique({
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

/** Bundles all published content for a section into one attempt —
 * mirrors createSkillPracticeAttempt in the TOEFL attempt-service. */
export async function createSkillPracticeAttempt(userId: string, section: SatSection): Promise<string> {
  const content = await prisma.satContent.findMany({
    where: { section, status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
  });
  if (content.length === 0) {
    throw new Error("Practice content isn't available yet.");
  }

  const attempt = await prisma.satAttempt.create({
    data: {
      userId,
      kind: "SKILL_PRACTICE",
      section,
      items: {
        create: content.map((c, i) => ({ contentId: c.id, order: i })),
      },
    },
  });

  return attempt.id;
}

/** Handles both MCQ (selectedOption) and numeric/grid-in
 * (numericAnswer) items with one function, since both are simple
 * discrete single-value answers persisted immediately on
 * selection/entry — same immediate-fire-per-answer convention the
 * WAEC/UTME practice session and TOEFL's recordMcqAnswer both already
 * use. Numeric matching is exact-string (trimmed) for this foundation
 * phase — real equivalence checking (e.g. "1/2" == "0.5") is deferred. */
export async function recordAnswer(
  itemId: string,
  userId: string,
  answer: { selectedOption?: string; numericAnswer?: string }
) {
  const item = await prisma.satAttemptItem.findUniqueOrThrow({
    where: { id: itemId },
    include: {
      attempt: { select: { id: true, userId: true, submittedAt: true } },
      content: { select: { correctOption: true, correctValue: true } },
    },
  });
  if (item.attempt.userId !== userId) throw new Error("Attempt not found.");
  if (item.attempt.submittedAt) throw new Error("This attempt has already been submitted.");

  const isCorrect =
    answer.selectedOption !== undefined
      ? answer.selectedOption === item.content.correctOption
      : answer.numericAnswer !== undefined
        ? answer.numericAnswer.trim() === item.content.correctValue?.trim()
        : null;

  await prisma.satAttemptItem.update({
    where: { id: itemId },
    data: {
      selectedOption: answer.selectedOption ?? undefined,
      numericAnswer: answer.numericAnswer ?? undefined,
      isCorrect,
    },
  });
}

export async function submitSkillAttempt(attemptId: string, userId: string, section: SatSection) {
  await assertOwnedInProgressSatAttempt(attemptId, userId);

  const items = await prisma.satAttemptItem.findMany({ where: { attemptId } });
  const correctCount = items.filter((i) => i.isCorrect).length;
  const score = computeSectionScore(correctCount, items.length);

  await prisma.satAttempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date(), [SECTION_SCORE_FIELD[section]]: score },
  });
}
