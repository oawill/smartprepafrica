import { prisma } from "@/lib/prisma";

/** General-purpose in-app notification writer, parallel to
 * src/lib/partners/notify.ts's notifyPartner — same fire-and-forget shape,
 * for any User rather than only Partner. */
export async function notifyUser(userId: string, type: string, message: string, link?: string) {
  await prisma.notification.create({
    data: { userId, type, message, link },
  });
}
