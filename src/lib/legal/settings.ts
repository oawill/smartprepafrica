import { prisma } from "@/lib/prisma";

/** Singleton config row, created with defaults (all null) on first read —
 * same upsert-on-read pattern as PartnerSettings/AiPlanLimit. Pages must
 * treat any null field as "not configured yet", never fabricate a value. */
export async function getPlatformSettings() {
  return prisma.platformSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}
