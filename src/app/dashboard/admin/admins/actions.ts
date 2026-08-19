"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import { generateTempPassword } from "@/lib/csv";
import type { AdminRole } from "@prisma/client";

async function activeSuperAdminCount(excludeUserId?: string) {
  return prisma.user.count({
    where: {
      role: "ADMIN",
      adminRole: "SUPER_ADMIN",
      status: "ACTIVE",
      id: excludeUserId ? { not: excludeUserId } : undefined,
    },
  });
}

export type CreateAdminState = { email: string; tempPassword: string } | { error: string } | null;

export async function createAdmin(_prev: CreateAdminState, formData: FormData): Promise<CreateAdminState> {
  try {
    const session = await requireActionPermission("admins.create");
    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const adminRole = formData.get("adminRole") as AdminRole;
    if (!name || !email || !adminRole) return { error: "Name, email, and admin role are required." };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { error: "A user with that email already exists." };

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const admin = await prisma.user.create({
      data: { name, email, passwordHash, role: "ADMIN", adminRole },
    });

    await logAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: "ADMIN_CREATED",
      resourceType: "User",
      resourceId: admin.id,
      result: "SUCCESS",
      after: { email, adminRole },
    });

    revalidatePath("/dashboard/admin/admins");
    // No email provider is configured in this environment — the temporary
    // password is only ever shown once, right here, to the creating admin.
    return { email, tempPassword };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create admin." };
  }
}

export async function changeAdminRole(formData: FormData) {
  const session = await requireActionPermission("roles.manage");
  const userId = formData.get("userId") as string;
  const adminRole = formData.get("adminRole") as AdminRole;
  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (target.adminRole === "SUPER_ADMIN" && adminRole !== "SUPER_ADMIN") {
    const remaining = await activeSuperAdminCount(userId);
    if (remaining === 0) {
      throw new Error("Cannot change this away from Super Admin — it's the last active Super Admin.");
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { adminRole } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "ADMIN_ROLE_CHANGED",
    resourceType: "User",
    resourceId: userId,
    result: "SUCCESS",
    before: { adminRole: target.adminRole },
    after: { adminRole },
  });
  revalidatePath("/dashboard/admin/admins");
}

export async function disableAdmin(formData: FormData) {
  const session = await requireActionPermission("admins.create");
  const userId = formData.get("userId") as string;
  if (userId === session.user.id) throw new Error("You cannot disable your own account.");

  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (target.adminRole === "SUPER_ADMIN") {
    const remaining = await activeSuperAdminCount(userId);
    if (remaining === 0) throw new Error("Cannot disable the last active Super Admin.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "SUSPENDED",
      statusReason: "Disabled by administrator",
      statusChangedById: session.user.id,
      statusChangedAt: new Date(),
      sessionVersion: { increment: 1 },
    },
  });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "ADMIN_DISABLED",
    resourceType: "User",
    resourceId: userId,
    result: "SUCCESS",
  });
  revalidatePath("/dashboard/admin/admins");
}

export async function reenableAdmin(formData: FormData) {
  const session = await requireActionPermission("admins.create");
  const userId = formData.get("userId") as string;

  await prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE", statusReason: null, statusChangedById: session.user.id, statusChangedAt: new Date() },
  });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "ADMIN_REENABLED",
    resourceType: "User",
    resourceId: userId,
    result: "SUCCESS",
  });
  revalidatePath("/dashboard/admin/admins");
}

export async function revokeAdminSessions(formData: FormData) {
  const session = await requireActionPermission("sessions.revoke");
  const userId = formData.get("userId") as string;

  await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "ADMIN_SESSIONS_REVOKED",
    resourceType: "User",
    resourceId: userId,
    result: "SUCCESS",
  });
  revalidatePath("/dashboard/admin/admins");
}
