import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/admin/permissions";
import { logAudit } from "@/lib/admin/audit";

/** Gate for any /dashboard/admin/** page. Mirrors the inline
 * `if (session.user.role !== "ADMIN") redirect("/dashboard")` check used
 * throughout the app (kept unchanged elsewhere) — this is the same rule,
 * factored out for the new Admin Portal pages so denied attempts get
 * audit-logged instead of silently redirecting. */
export async function requireAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    await logAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role as Role,
      action: "ADMIN_AREA_ACCESS_DENIED",
      resourceType: "AdminPortal",
      result: "DENIED",
    });
    redirect("/dashboard");
  }
  return session;
}

/** Gate for a specific permission within the admin area. Used on pages that
 * only some admin sub-roles may see (e.g. RBAC management, audit log).
 * Redirects to /unauthorized rather than /dashboard, since the caller IS an
 * admin — they just lack this specific permission. */
export async function requireAdminPagePermission(permission: Permission) {
  const session = await requireAdminPage();
  if (!hasPermission(session.user.adminRole, permission)) {
    await logAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role as Role,
      action: `PERMISSION_DENIED:${permission}`,
      resourceType: "Permission",
      resourceId: permission,
      result: "DENIED",
    });
    redirect("/unauthorized");
  }
  return session;
}

/** Gate for a Server Action. Throws (caught by the calling form's error
 * handling) instead of redirecting, matching the existing
 * `throw new Error(...)` pattern used by every admin action in this app.
 * Always audit-logs denials. */
export async function requireActionPermission(permission: Permission) {
  const session = await auth();
  if (!session) redirect("/login");

  const h = await headers();
  const userAgent = h.get("user-agent");

  if (session.user.role !== "ADMIN") {
    await logAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role as Role,
      action: `PERMISSION_DENIED:${permission}`,
      resourceType: "Permission",
      resourceId: permission,
      result: "DENIED",
      userAgent,
    });
    throw new Error("Only platform administrators can do that.");
  }

  if (!hasPermission(session.user.adminRole, permission)) {
    await logAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role as Role,
      action: `PERMISSION_DENIED:${permission}`,
      resourceType: "Permission",
      resourceId: permission,
      result: "DENIED",
      userAgent,
    });
    throw new Error("Your admin role does not have permission to do that.");
  }

  return session;
}
