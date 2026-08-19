import { prisma } from "@/lib/prisma";

/** Singleton config row, created with defaults on first read — same
 * upsert-on-read pattern used for AiPlanLimit. Admins edit it in place. */
export async function getPartnerSettings() {
  return prisma.partnerSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}
