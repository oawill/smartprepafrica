import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** General-purpose audit trail for the Admin Portal. Complements the
 * Partner-program-scoped logPartnerAudit — the Audit Log viewer reads from
 * both tables. Never update or delete rows written here. */
export async function logAudit(params: {
  actorUserId?: string | null;
  actorRole?: Role | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  result: "SUCCESS" | "DENIED" | "FAILURE";
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipHash?: string | null;
  userAgent?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId ?? undefined,
      actorRole: params.actorRole ?? undefined,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? undefined,
      result: params.result,
      before: (params.before ?? undefined) as never,
      after: (params.after ?? undefined) as never,
      ipHash: params.ipHash ?? undefined,
      userAgent: params.userAgent ?? undefined,
    },
  });
}
