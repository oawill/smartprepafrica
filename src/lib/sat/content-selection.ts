import type { SatSection, Difficulty } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SatContentSelectionParams = {
  section: SatSection;
  domain?: string;
  skill?: string;
  difficulty?: Difficulty | Difficulty[];
  questionType?: string;
  /** Restrict to content from one bulk-import batch — the spec's
   * "source/content batch" selection dimension. */
  importBatchId?: string;
  excludeIds?: string[];
  limit?: number;
};

/** Generalizes the ad-hoc "select everything published" queries that used
 * to live directly in attempt-service.ts, plus the difficulty-tier
 * filtering that only Module 2 mock-exam routing had (see
 * module-routing.ts). Calling this with only `{section}` returns exactly
 * what the old raw query did — same rows, same order, no limit — so
 * existing skill-practice behavior is unchanged. This is prep for future
 * adaptive practice (domain/skill-aware selection), not an adaptive
 * engine itself. */
export async function selectSatContent(params: SatContentSelectionParams) {
  return prisma.satContent.findMany({
    where: {
      section: params.section,
      status: "PUBLISHED",
      ...(params.domain ? { domain: params.domain } : {}),
      ...(params.skill ? { skill: params.skill } : {}),
      ...(params.difficulty
        ? { difficulty: Array.isArray(params.difficulty) ? { in: params.difficulty } : params.difficulty }
        : {}),
      ...(params.questionType ? { questionType: params.questionType } : {}),
      ...(params.importBatchId ? { importBatchId: params.importBatchId } : {}),
      ...(params.excludeIds && params.excludeIds.length > 0 ? { id: { notIn: params.excludeIds } } : {}),
    },
    orderBy: { createdAt: "asc" },
    ...(params.limit ? { take: params.limit } : {}),
  });
}
