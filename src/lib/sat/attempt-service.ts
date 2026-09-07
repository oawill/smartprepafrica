import { prisma } from "@/lib/prisma";
import { computeSectionScore, computeCompositeScore } from "@/lib/sat/scoring";
import { SAT_CONFIG } from "@/lib/sat/config";
import { selectSatContent } from "@/lib/sat/content-selection";
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
  const content = await selectSatContent({ section });
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
): Promise<{ isCorrect: boolean | null }> {
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

  return { isCorrect };
}

/** Toggles flagged on/off — allowed both mid-attempt and after
 * submission, since Review Mode needs to flag/unflag items from past,
 * already-completed attempts too, not just the one in progress. */
export async function toggleFlag(itemId: string, userId: string) {
  const item = await prisma.satAttemptItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { flagged: true, attempt: { select: { userId: true } } },
  });
  if (item.attempt.userId !== userId) throw new Error("Item not found.");

  await prisma.satAttemptItem.update({ where: { id: itemId }, data: { flagged: !item.flagged } });
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

/** Bundles a capped, shuffled-by-insertion-order sample of PUBLISHED
 * content from BOTH sections into one cross-section attempt — a
 * diagnostic assesses R&W and Math together, unlike a skill-practice
 * attempt which is single-section. section stays null on the attempt
 * itself (SatAttempt.section is reserved for single-section rows). */
export async function createDiagnosticAttempt(userId: string): Promise<string> {
  const [readingWriting, math] = await Promise.all([
    prisma.satContent.findMany({
      where: { section: "READING_WRITING", status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      take: SAT_CONFIG.diagnosticItemsPerSection,
    }),
    prisma.satContent.findMany({
      where: { section: "MATH", status: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
      take: SAT_CONFIG.diagnosticItemsPerSection,
    }),
  ]);
  const content = [...readingWriting, ...math];
  if (content.length === 0) {
    throw new Error("Diagnostic content isn't available yet.");
  }

  const attempt = await prisma.satAttempt.create({
    data: {
      userId,
      kind: "DIAGNOSTIC",
      items: {
        create: content.map((c, i) => ({ contentId: c.id, order: i })),
      },
    },
  });

  return attempt.id;
}

/** Scores a diagnostic's two sections independently (same per-item
 * correctness already recorded by recordAnswer) and derives the
 * composite from both — never fabricated, null unless both sections
 * were actually assessed in this attempt. */
export async function submitDiagnosticAttempt(attemptId: string, userId: string) {
  await assertOwnedInProgressSatAttempt(attemptId, userId);

  const items = await prisma.satAttemptItem.findMany({
    where: { attemptId },
    include: { content: { select: { section: true } } },
  });

  const bySection = (section: SatSection) => items.filter((i) => i.content.section === section);
  const scoreFor = (section: SatSection) => {
    const sectionItems = bySection(section);
    if (sectionItems.length === 0) return null;
    const correctCount = sectionItems.filter((i) => i.isCorrect).length;
    return computeSectionScore(correctCount, sectionItems.length);
  };

  const readingWritingScore = scoreFor("READING_WRITING");
  const mathScore = scoreFor("MATH");
  const overallScore = computeCompositeScore(readingWritingScore, mathScore);

  await prisma.satAttempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date(), readingWritingScore, mathScore, overallScore },
  });
}
