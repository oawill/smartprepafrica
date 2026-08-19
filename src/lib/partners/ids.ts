import { prisma } from "@/lib/prisma";

/** Generates a permanent, never-reused sequential reference number. Starts
 * from the current row count + 1 and probes forward past any collision
 * (guarantees uniqueness via the DB constraint even under races; gaps are
 * fine, reuse is not). */
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

export async function generatePartnerNumber(): Promise<string> {
  return generateSequential(
    "EDP-",
    8,
    () => prisma.partner.count(),
    async (c) => !!(await prisma.partner.findUnique({ where: { partnerNumber: c } }))
  );
}

/** Same digits as the partner number, no punctuation — used in ?ref= URLs. */
export function referralCodeFromPartnerNumber(partnerNumber: string): string {
  return partnerNumber.replace(/[^0-9A-Za-z]/g, "");
}

export async function generateSchoolLeadNumber(): Promise<string> {
  return generateSequential(
    "SCH-LEAD-",
    6,
    () => prisma.partnerSchoolLead.count(),
    async (c) => !!(await prisma.partnerSchoolLead.findUnique({ where: { leadNumber: c } }))
  );
}

export async function generateCommissionNumber(): Promise<string> {
  return generateSequential(
    "COM-",
    7,
    () => prisma.partnerCommission.count(),
    async (c) => !!(await prisma.partnerCommission.findUnique({ where: { commissionNumber: c } }))
  );
}

export async function generatePayoutNumber(): Promise<string> {
  return generateSequential(
    "PAY-",
    6,
    () => prisma.partnerPayout.count(),
    async (c) => !!(await prisma.partnerPayout.findUnique({ where: { payoutNumber: c } }))
  );
}
