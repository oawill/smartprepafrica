import type { ToeflSkill, Difficulty } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ToeflContentSelectionParams = {
  skill: ToeflSkill;
  taskType?: string;
  difficulty?: Difficulty | Difficulty[];
  importBatchId?: string;
  excludeIds?: string[];
  limit?: number;
};

/** Same shape and same "no-filter behavior unchanged" guarantee as
 * src/lib/sat/content-selection.ts's selectSatContent. */
export async function selectToeflContent(params: ToeflContentSelectionParams) {
  return prisma.toeflContent.findMany({
    where: {
      skill: params.skill,
      status: "PUBLISHED",
      ...(params.taskType ? { taskType: params.taskType } : {}),
      ...(params.difficulty
        ? { difficulty: Array.isArray(params.difficulty) ? { in: params.difficulty } : params.difficulty }
        : {}),
      ...(params.importBatchId ? { importBatchId: params.importBatchId } : {}),
      ...(params.excludeIds && params.excludeIds.length > 0 ? { id: { notIn: params.excludeIds } } : {}),
    },
    orderBy: { createdAt: "asc" },
    ...(params.limit ? { take: params.limit } : {}),
  });
}
