import { prisma } from "@/lib/prisma";
import { computeSectionScore, computeCompositeScore } from "@/lib/sat/scoring";
import { SAT_CONFIG } from "@/lib/sat/config";
import { selectNextSATModule } from "@/lib/sat/module-routing";
import { assertOwnedInProgressSatAttempt, SECTION_SCORE_FIELD } from "@/lib/sat/attempt-service";
import type { SatSection } from "@prisma/client";

const TIER_FIELD: Record<SatSection, "readingWritingModule2Tier" | "mathModule2Tier"> = {
  READING_WRITING: "readingWritingModule2Tier",
  MATH: "mathModule2Tier",
};

const DIFFICULTY_POOL: Record<"EASIER" | "HARDER", ("EASY" | "MEDIUM" | "HARD")[]> = {
  EASIER: ["EASY", "MEDIUM"],
  HARDER: ["MEDIUM", "HARD"],
};

/** Mock Exam starts with Reading & Writing Module 1 only — Math Module 1
 * and every Module 2 are created lazily as the student advances, since
 * Module 2's content pool depends on the adaptive routing decision (which
 * can't be known until its Module 1 is scored). */
export async function createMockExamAttempt(userId: string): Promise<string> {
  const module1 = await prisma.satContent.findMany({
    where: { section: "READING_WRITING", status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
    take: SAT_CONFIG.mockExam.module1Size,
  });
  if (module1.length === 0) {
    throw new Error("Mock exam content isn't available yet.");
  }

  const attempt = await prisma.satAttempt.create({
    data: {
      userId,
      kind: "MOCK_EXAM",
      items: { create: module1.map((c, i) => ({ contentId: c.id, module: 1, order: i })) },
    },
  });

  return attempt.id;
}

/** The break between sections — called when the student clicks "Start
 * Math Section" after Reading & Writing is fully scored. */
export async function startMockExamMathModule1(attemptId: string, userId: string) {
  await assertOwnedInProgressSatAttempt(attemptId, userId);

  const module1 = await prisma.satContent.findMany({
    where: { section: "MATH", status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
    take: SAT_CONFIG.mockExam.module1Size,
  });
  if (module1.length === 0) {
    throw new Error("Math content isn't available yet.");
  }

  const existingCount = await prisma.satAttemptItem.count({ where: { attemptId } });
  await prisma.satAttemptItem.createMany({
    data: module1.map((c, i) => ({ attemptId, contentId: c.id, module: 1, order: existingCount + i })),
  });
}

/** Scores the just-finished module. For Module 1, routes to an adaptive
 * Module 2 (excluding items already used, filtered by the selected
 * difficulty tier) and creates its items. For Module 2, scores the
 * section and — once Math (the last section) is done — finalizes the
 * whole attempt with the composite score. */
export async function submitMockExamModule(
  attemptId: string,
  userId: string,
  section: SatSection,
  module: 1 | 2
) {
  await assertOwnedInProgressSatAttempt(attemptId, userId);

  const items = await prisma.satAttemptItem.findMany({
    where: { attemptId, module, content: { section } },
  });
  const correctCount = items.filter((i) => i.isCorrect).length;

  if (module === 1) {
    const tier = selectNextSATModule(correctCount, items.length);
    const usedContentIds = items.map((i) => i.contentId);
    const module2 = await prisma.satContent.findMany({
      where: {
        section,
        status: "PUBLISHED",
        id: { notIn: usedContentIds },
        difficulty: { in: DIFFICULTY_POOL[tier] },
      },
      orderBy: { createdAt: "asc" },
      take: SAT_CONFIG.mockExam.module2Size,
    });
    if (module2.length === 0) {
      throw new Error("Not enough content available for the next module yet.");
    }

    const existingCount = await prisma.satAttemptItem.count({ where: { attemptId } });
    await prisma.satAttemptItem.createMany({
      data: module2.map((c, i) => ({ attemptId, contentId: c.id, module: 2, order: existingCount + i })),
    });
    await prisma.satAttempt.update({ where: { id: attemptId }, data: { [TIER_FIELD[section]]: tier } });
    return;
  }

  const score = computeSectionScore(correctCount, items.length);
  await prisma.satAttempt.update({ where: { id: attemptId }, data: { [SECTION_SCORE_FIELD[section]]: score } });

  if (section === "MATH") {
    const attempt = await prisma.satAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      select: { readingWritingScore: true },
    });
    const overallScore = computeCompositeScore(attempt.readingWritingScore, score);
    await prisma.satAttempt.update({
      where: { id: attemptId },
      data: { submittedAt: new Date(), overallScore },
    });
  }
}
