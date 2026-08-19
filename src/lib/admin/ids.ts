import { prisma } from "@/lib/prisma";

/** Same sequential-with-collision-probe strategy as
 * src/lib/partners/ids.ts, extended to the Admin Portal's entity types.
 * Never sequential-only in a context where enumeration matters — these are
 * reference numbers shown alongside the real cuid primary key, not used for
 * lookups or authorization. */
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

export async function generateStudentNumber(): Promise<string> {
  return generateSequential(
    "STU-",
    8,
    () => prisma.user.count({ where: { role: "STUDENT" } }),
    async (c) => !!(await prisma.user.findUnique({ where: { studentNumber: c } }))
  );
}

export async function generateSchoolNumber(): Promise<string> {
  return generateSequential(
    "SCH-",
    6,
    () => prisma.school.count(),
    async (c) => !!(await prisma.school.findUnique({ where: { schoolNumber: c } }))
  );
}

export async function generateQuestionNumber(): Promise<string> {
  return generateSequential(
    "QUE-",
    8,
    () => prisma.question.count(),
    async (c) => !!(await prisma.question.findUnique({ where: { questionNumber: c } }))
  );
}

export async function generateTransactionNumber(): Promise<string> {
  return generateSequential(
    "TXN-",
    9,
    () => prisma.payment.count(),
    async (c) => !!(await prisma.payment.findUnique({ where: { transactionNumber: c } }))
  );
}

export async function generateSubmissionNumber(): Promise<string> {
  return generateSequential(
    "SUP-",
    6,
    () => prisma.contactSubmission.count(),
    async (c) => !!(await prisma.contactSubmission.findUnique({ where: { submissionNumber: c } }))
  );
}
