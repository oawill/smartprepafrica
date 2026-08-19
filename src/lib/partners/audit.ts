import { prisma } from "@/lib/prisma";

export async function logPartnerAudit(params: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.partnerAuditLog.create({
    data: {
      actorUserId: params.actorUserId ?? undefined,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as never,
    },
  });
}
