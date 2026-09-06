import { prisma } from "@/lib/prisma";
import { SAT_CONFIG } from "@/lib/sat/config";

export async function getScoreGoal(userId: string) {
  return prisma.satScoreGoal.findUnique({ where: { userId } });
}

/** Upsert-by-userId, mirroring the one-row-per-user shape of the model.
 * Validation only enforces the composite is a real, in-range score —
 * no projection or "you'll hit this by then" logic, since the spec
 * explicitly forbids promising a particular score improvement. */
export async function saveScoreGoal(userId: string, targetScore: number, testDate: Date | null) {
  const { compositeMin, compositeMax } = SAT_CONFIG.scoreScale;
  if (!Number.isInteger(targetScore) || targetScore < compositeMin || targetScore > compositeMax) {
    throw new Error(`Target score must be a whole number between ${compositeMin} and ${compositeMax}.`);
  }

  await prisma.satScoreGoal.upsert({
    where: { userId },
    create: { userId, targetScore, testDate },
    update: { targetScore, testDate },
  });
}
