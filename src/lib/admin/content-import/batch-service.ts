import type { ContentImportFormat, InternationalExamProduct } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PERSIST_CHUNK = 1000;

export async function createBatch(opts: {
  exam: InternationalExamProduct;
  format: ContentImportFormat;
  filename: string;
  createdById: string;
}) {
  return prisma.contentImportBatch.create({
    data: { exam: opts.exam, format: opts.format, filename: opts.filename, createdById: opts.createdById },
  });
}

/** Persists parsed rows as PENDING ContentImportRow records in chunks, and
 * records the file's total row count on the batch. Never holds more than
 * one chunk's worth of Prisma create data in flight at a time. */
export async function persistParsedRows(batchId: string, records: Record<string, string>[]) {
  for (let i = 0; i < records.length; i += PERSIST_CHUNK) {
    const slice = records.slice(i, i + PERSIST_CHUNK);
    await prisma.contentImportRow.createMany({
      data: slice.map((rawData, offset) => ({
        batchId,
        rowNumber: i + offset + 1,
        status: "PENDING",
        rawData: rawData as never,
      })),
    });
  }
  await prisma.contentImportBatch.update({
    where: { id: batchId },
    data: { totalRecords: records.length },
  });
}

export async function getBatchSummary(batchId: string) {
  return prisma.contentImportBatch.findUniqueOrThrow({ where: { id: batchId } });
}

export async function listBatches(exam?: InternationalExamProduct) {
  return prisma.contentImportBatch.findMany({
    where: exam ? { exam } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function listBatchRows(
  batchId: string,
  opts: { status?: string; cursor?: string; take?: number } = {}
) {
  return prisma.contentImportRow.findMany({
    where: { batchId, status: opts.status ? (opts.status as never) : undefined },
    orderBy: { rowNumber: "asc" },
    take: opts.take ?? 50,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
}
