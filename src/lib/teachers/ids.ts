import { prisma } from "@/lib/prisma";

/** Generates a permanent, never-reused sequential reference number. Same
 * shape as src/lib/partners/ids.ts's generateSequential — duplicated
 * rather than imported across the partner/teacher boundary, matching
 * this codebase's own precedent of small per-domain duplication (e.g.
 * EMA_ALPHA repeated across mastery-service.ts/readiness-service.ts). */
async function generateSequential(
  prefix: string,
  pad: number,
  count: () => Promise<number>,
  exists: (candidate: string) => Promise<boolean>
): Promise<string> {
  let n = (await count()) + 1;
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = `${prefix}${String(n).padStart(pad, "0")}`;
    if (!(await exists(candidate))) return candidate;
    n++;
  }
  throw new Error(`Could not generate a unique ${prefix} number.`);
}

export async function generateTeacherCommissionNumber(): Promise<string> {
  return generateSequential(
    "TCM-",
    7,
    () => prisma.teacherCommission.count(),
    async (c) => !!(await prisma.teacherCommission.findUnique({ where: { commissionNumber: c } }))
  );
}

export async function generateTeacherPayoutNumber(): Promise<string> {
  return generateSequential(
    "TPO-",
    6,
    () => prisma.teacherPayout.count(),
    async (c) => !!(await prisma.teacherPayout.findUnique({ where: { payoutNumber: c } }))
  );
}
