"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import type { BulkResult } from "@/lib/admin/bulk-types";

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

/** Bulk-suspends a set of user ids in one batched write. Server-side
 * validates every id: must exist, must not be the acting admin's own
 * account, must not be an ADMIN-role account (those go through
 * dashboard/admin/admins, which has its own last-Super-Admin protection).
 * Ids that fail validation are reported back, never silently dropped. */
export async function bulkSuspendUsers(userIds: string[], reason?: string): Promise<BulkResult> {
  const session = await requireActionPermission("users.suspend");
  const trimmedReason = (reason ?? "").trim();
  if (!trimmedReason) throw new Error("A reason is required to suspend accounts.");
  if (userIds.length === 0) return { updatedCount: 0, failed: [] };

  const found = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, role: true },
  });
  const foundById = new Map(found.map((u) => [u.id, u]));

  const failed: { id: string; reason: string }[] = [];
  const eligibleIds: string[] = [];

  for (const id of userIds) {
    const user = foundById.get(id);
    if (!user) {
      failed.push({ id, reason: "Not found" });
    } else if (id === session.user.id) {
      failed.push({ id, reason: "Cannot suspend your own account" });
    } else if (user.role === "ADMIN") {
      failed.push({ id, reason: "Admin accounts must be managed from Administrators" });
    } else {
      eligibleIds.push(id);
    }
  }

  if (eligibleIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: eligibleIds } },
      data: {
        status: "SUSPENDED",
        statusReason: trimmedReason,
        statusChangedById: session.user.id,
        statusChangedAt: new Date(),
        sessionVersion: { increment: 1 },
      },
    });
  }

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "USERS_BULK_SUSPENDED",
    resourceType: "User",
    result: "SUCCESS",
    after: { reason: trimmedReason, updatedIds: eligibleIds, failedIds: failed.map((f) => f.id) },
  });

  revalidatePath("/dashboard/admin/users", "layout");
  return { updatedCount: eligibleIds.length, failed };
}

export async function bulkReactivateUsers(userIds: string[]): Promise<BulkResult> {
  const session = await requireActionPermission("users.suspend");
  if (userIds.length === 0) return { updatedCount: 0, failed: [] };

  const found = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, role: true },
  });
  const foundById = new Map(found.map((u) => [u.id, u]));

  const failed: { id: string; reason: string }[] = [];
  const eligibleIds: string[] = [];

  for (const id of userIds) {
    const user = foundById.get(id);
    if (!user) failed.push({ id, reason: "Not found" });
    else eligibleIds.push(id);
  }

  if (eligibleIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: eligibleIds } },
      data: {
        status: "ACTIVE",
        statusReason: null,
        statusChangedById: session.user.id,
        statusChangedAt: new Date(),
      },
    });
  }

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "USERS_BULK_REACTIVATED",
    resourceType: "User",
    result: "SUCCESS",
    after: { updatedIds: eligibleIds, failedIds: failed.map((f) => f.id) },
  });

  revalidatePath("/dashboard/admin/users", "layout");
  return { updatedCount: eligibleIds.length, failed };
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
