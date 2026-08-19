"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

export async function suspendUser(formData: FormData) {
  const session = await requireActionPermission("users.suspend");
  const userId = formData.get("userId") as string;
  const reason = ((formData.get("reason") as string) || "").trim();
  const redirectTo = formData.get("redirectTo") as string;
  if (!reason) throw new Error("A reason is required to suspend an account.");
  if (userId === session.user.id) throw new Error("You cannot suspend your own account.");

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "SUSPENDED",
      statusReason: reason,
      statusChangedById: session.user.id,
      statusChangedAt: new Date(),
      sessionVersion: { increment: 1 },
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "USER_SUSPENDED",
    resourceType: "User",
    resourceId: userId,
    result: "SUCCESS",
    after: { reason },
  });

  revalidatePath(redirectTo);
}

export async function reactivateUser(formData: FormData) {
  const session = await requireActionPermission("users.suspend");
  const userId = formData.get("userId") as string;
  const redirectTo = formData.get("redirectTo") as string;

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "ACTIVE",
      statusReason: null,
      statusChangedById: session.user.id,
      statusChangedAt: new Date(),
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "USER_REACTIVATED",
    resourceType: "User",
    resourceId: userId,
    result: "SUCCESS",
  });

  revalidatePath(redirectTo);
}

/** The closest safe equivalent to "trigger secure access reset" available in
 * this environment: forces sign-out everywhere immediately via
 * sessionVersion. Emailing a password-reset link is out of scope — no
 * transactional email provider is configured here. */
export async function forceSignOut(formData: FormData) {
  const session = await requireActionPermission("sessions.revoke");
  const userId = formData.get("userId") as string;
  const redirectTo = formData.get("redirectTo") as string;

  await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "USER_SESSIONS_REVOKED",
    resourceType: "User",
    resourceId: userId,
    result: "SUCCESS",
  });

  revalidatePath(redirectTo);
}
