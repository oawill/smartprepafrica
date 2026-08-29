"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Shared across every role's dashboard — the caller passes back its own
 * path since one generic action can't know which dashboard page to
 * revalidate. */
export async function markNotificationRead(formData: FormData) {
  const session = await auth();
  if (!session) return;

  const notificationId = formData.get("notificationId") as string;
  const path = formData.get("path") as string;

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { readAt: new Date() },
  });

  if (path) revalidatePath(path);
}

export async function markAllNotificationsRead(formData: FormData) {
  const session = await auth();
  if (!session) return;

  const path = formData.get("path") as string;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  if (path) revalidatePath(path);
}
