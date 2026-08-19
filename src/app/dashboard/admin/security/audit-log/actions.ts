"use server";

import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

export async function logAuditExport(rowCount: number) {
  const session = await requireActionPermission("audit.export");
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "AUDIT_LOG_EXPORTED",
    resourceType: "AuditLog",
    result: "SUCCESS",
    after: { rowCount },
  });
}
