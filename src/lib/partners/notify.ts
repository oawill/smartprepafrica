import type { PartnerNotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function notifyPartner(
  partnerId: string,
  type: PartnerNotificationType,
  message: string
) {
  await prisma.partnerNotification.create({
    data: { partnerId, type, message },
  });
}
