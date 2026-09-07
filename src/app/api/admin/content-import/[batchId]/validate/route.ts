import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/admin/permissions";
import { logAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/prisma";
import { validateBatch } from "@/lib/admin/content-import/import-service";

export async function POST(_request: Request, context: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await context.params;
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only platform administrators can do that." }, { status: 401 });
  }

  const batch = await prisma.contentImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) return NextResponse.json({ error: "Import batch not found." }, { status: 404 });

  const permission: Permission = batch.exam === "SAT" ? "sat.bulk_import" : "toefl.bulk_import";
  if (!hasPermission(session.user.adminRole, permission)) {
    return NextResponse.json({ error: "Your admin role does not have permission to do that." }, { status: 403 });
  }

  const summary = await validateBatch(batchId);

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role as Role,
    action: "CONTENT_IMPORT_VALIDATED",
    resourceType: "ContentImportBatch",
    resourceId: batchId,
    result: "SUCCESS",
    after: summary,
  });

  return NextResponse.json(summary);
}
