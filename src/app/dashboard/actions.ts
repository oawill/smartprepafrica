"use server";

import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/admin/audit";
import { roleDashboardPath } from "@/lib/roles";

/** Switches which of a user's granted roles (UserRole) is currently active
 * (User.role) — the actual role set is admin-granted (see
 * grantAdditionalRole in dashboard/admin/actions.ts), this only lets a user
 * move between roles they already hold. Takes effect on the very next
 * request without a full re-login — see the `token.role` refresh added to
 * the jwt callback in src/lib/auth.ts. */
export async function switchActiveRole(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const targetRole = formData.get("role") as Role;

  const owned = await prisma.userRole.findUnique({
    where: { userId_role: { userId: session.user.id, role: targetRole } },
  });
  if (!owned) {
    throw new Error("You don't have access to that workspace.");
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { role: targetRole } });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: targetRole,
    action: "WORKSPACE_SWITCHED",
    resourceType: "User",
    resourceId: session.user.id,
    result: "SUCCESS",
    before: { role: session.user.role },
    after: { role: targetRole },
  });

  redirect(roleDashboardPath[targetRole]);
}
