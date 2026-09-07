"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import type { NormalizedImportRow } from "@/lib/admin/content-import/normalize";
import {
  prepareContentSets,
  importBatchChunk,
  publishBatch,
  rollbackBatch,
  type ImportChunkResult,
} from "@/lib/admin/content-import/import-service";

async function permissionForBatch(batchId: string) {
  const batch = await prisma.contentImportBatch.findUniqueOrThrow({ where: { id: batchId } });
  return { batch, permission: batch.exam === "SAT" ? ("sat.bulk_import" as const) : ("toefl.bulk_import" as const) };
}

export async function getBatchSummaryAction(batchId: string) {
  const { batch } = await permissionForBatch(batchId);
  await requireActionPermission(batch.exam === "SAT" ? "sat.bulk_import" : "toefl.bulk_import");
  return batch;
}

/** First 20 VALID rows, for the Import Preview screen — rendered through
 * the real student-facing components so admins see exactly what students
 * would see. */
export async function getPreviewRowsAction(batchId: string): Promise<NormalizedImportRow[]> {
  const { permission } = await permissionForBatch(batchId);
  await requireActionPermission(permission);
  const rows = await prisma.contentImportRow.findMany({
    where: { batchId, status: "VALID" },
    orderBy: { rowNumber: "asc" },
    take: 20,
  });
  return rows.map((r) => r.rawData as unknown as NormalizedImportRow);
}

export async function listBatchRowsAction(
  batchId: string,
  opts: { status?: "VALID" | "WARNING" | "ERROR" | "DUPLICATE" | "IMPORTED"; cursor?: string }
) {
  const { permission } = await permissionForBatch(batchId);
  await requireActionPermission(permission);
  return prisma.contentImportRow.findMany({
    where: { batchId, status: opts.status },
    orderBy: { rowNumber: "asc" },
    take: 50,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
}

export async function prepareContentSetsAction(batchId: string) {
  const { permission } = await permissionForBatch(batchId);
  const session = await requireActionPermission(permission);
  const result = await prepareContentSets(batchId);
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "CONTENT_IMPORT_SETS_PREPARED",
    resourceType: "ContentImportBatch",
    resourceId: batchId,
    result: "SUCCESS",
    after: result,
  });
  return result;
}

export async function importBatchChunkAction(
  batchId: string,
  cursor: string | null
): Promise<ImportChunkResult> {
  const { permission } = await permissionForBatch(batchId);
  await requireActionPermission(permission);
  const result = await importBatchChunk(batchId, cursor);
  if (result.done) {
    revalidatePath("/dashboard/admin/content-import");
    revalidatePath(`/dashboard/admin/content-import/${batchId}`);
  }
  return result;
}

export async function publishBatchAction(formData: FormData) {
  const batchId = formData.get("batchId") as string;
  const { batch } = await permissionForBatch(batchId);
  const session = await requireActionPermission(batch.exam === "SAT" ? "sat.publish" : "toefl.publish");

  await publishBatch(batchId);

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "CONTENT_IMPORT_PUBLISHED",
    resourceType: "ContentImportBatch",
    resourceId: batchId,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/admin/content-import");
  revalidatePath(`/dashboard/admin/content-import/${batchId}`);
}

export async function rollbackBatchAction(formData: FormData) {
  const batchId = formData.get("batchId") as string;
  const { batch } = await permissionForBatch(batchId);
  const session = await requireActionPermission(batch.exam === "SAT" ? "sat.archive" : "toefl.archive");

  await rollbackBatch(batchId);

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "CONTENT_IMPORT_ROLLED_BACK",
    resourceType: "ContentImportBatch",
    resourceId: batchId,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/admin/content-import");
  revalidatePath(`/dashboard/admin/content-import/${batchId}`);
}
