import { randomUUID } from "node:crypto";
import { Prisma, type InternationalExamProduct } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeRow, parseTags, parseBoolean, type NormalizedImportRow } from "@/lib/admin/content-import/normalize";
import { validateSatRow } from "@/lib/admin/content-import/validate-sat";
import { validateToeflRow } from "@/lib/admin/content-import/validate-toefl";
import { checkSatDuplicates, checkToeflDuplicates } from "@/lib/admin/content-import/duplicate-check";

const PERSIST_CHUNK = 1000;
const IMPORT_CHUNK_DEFAULT = 1000;

/** Fetches every PENDING row for a batch and normalizes it. Holds the
 * whole batch in memory for validation — fine well past 100k rows of
 * these compact objects; a further-out scale would need a streaming
 * two-pass redesign, not attempted here. */
async function loadPendingRows(batchId: string): Promise<{ id: string; rowNumber: number; row: NormalizedImportRow }[]> {
  const rows = await prisma.contentImportRow.findMany({
    where: { batchId, status: "PENDING" },
    orderBy: { rowNumber: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    rowNumber: r.rowNumber,
    row: normalizeRow((r.rawData ?? {}) as Record<string, string>, r.rowNumber),
  }));
}

function buildDefinedContentSetIds(rows: NormalizedImportRow[]): Set<string> {
  const defined = new Set<string>();
  for (const row of rows) {
    if (!row.contentSetExternalId) continue;
    if (row.passageText || row.audioUrl || row.imageUrl) defined.add(row.contentSetExternalId);
  }
  return defined;
}

export async function validateBatch(batchId: string) {
  const batch = await prisma.contentImportBatch.update({
    where: { id: batchId },
    data: { status: "VALIDATING" },
  });

  const loaded = await loadPendingRows(batchId);
  const rows = loaded.map((l) => l.row);

  const existingContentSetExternalIds =
    batch.exam === "SAT"
      ? new Set((await prisma.satContentSet.findMany({ select: { externalId: true } })).map((s) => s.externalId ?? ""))
      : new Set((await prisma.toeflContentSet.findMany({ select: { externalId: true } })).map((s) => s.externalId ?? ""));
  const definedContentSetIds = buildDefinedContentSetIds(rows);

  const duplicates = batch.exam === "SAT" ? await checkSatDuplicates(rows) : await checkToeflDuplicates(rows);

  const results = loaded.map(({ id, rowNumber, row }) => {
    const base =
      batch.exam === "SAT"
        ? validateSatRow(row, { definedContentSetIds, existingContentSetExternalIds })
        : validateToeflRow(row, { definedContentSetIds, existingContentSetExternalIds });

    const dupExternal = duplicates.duplicateExternalId.get(rowNumber);
    const dupPrompt = duplicates.duplicatePrompt.get(rowNumber);

    // A genuine data error on the row (missing options, bad answer key,
    // etc.) always wins — it needs fixing regardless of duplicate status.
    // Otherwise, a duplicate finding is its own distinct status (tracked
    // separately from ERROR in the batch summary), not folded into either
    // ERROR or WARNING.
    if (base.status === "ERROR") {
      return { id, rowNumber, rawData: row, status: "ERROR" as const, messages: base.messages };
    }
    if (dupExternal) {
      return { id, rowNumber, rawData: row, status: "DUPLICATE" as const, messages: [...base.messages, dupExternal] };
    }
    if (dupPrompt) {
      return { id, rowNumber, rawData: row, status: "DUPLICATE" as const, messages: [...base.messages, dupPrompt] };
    }
    return { id, rowNumber, rawData: row, status: base.status, messages: base.messages };
  });

  // Replace PENDING rows with their validated result. rawData is kept for
  // every row at this stage — VALID/WARNING rows still need it to actually
  // create content on import — and only cleared once a row is IMPORTED
  // (see importBatchChunk), so it never permanently duplicates data a real
  // content row already has.
  await prisma.contentImportRow.deleteMany({ where: { batchId, status: "PENDING" } });
  for (let i = 0; i < results.length; i += PERSIST_CHUNK) {
    const slice = results.slice(i, i + PERSIST_CHUNK);
    await prisma.contentImportRow.createMany({
      data: slice.map((r) => ({
        batchId,
        rowNumber: r.rowNumber,
        status: r.status,
        messages: r.messages,
        rawData: r.rawData as never,
      })),
    });
  }

  const counts = {
    validRecords: results.filter((r) => r.status === "VALID").length,
    warningRecords: results.filter((r) => r.status === "WARNING").length,
    errorRecords: results.filter((r) => r.status === "ERROR").length,
    duplicateRecords: results.filter((r) => r.status === "DUPLICATE").length,
  };

  await prisma.contentImportBatch.update({
    where: { id: batchId },
    data: { status: "VALIDATED", ...counts },
  });

  return { batchId, ...counts, totalRecords: results.length };
}

/** Idempotent — creates any content sets introduced by VALID/WARNING rows
 * that don't already exist (relies on the @@unique([section, externalId])
 * constraint + skipDuplicates, so calling this more than once, e.g. after
 * a retried request, is safe). Must run before importChunk. */
export async function prepareContentSets(batchId: string) {
  const batch = await prisma.contentImportBatch.findUniqueOrThrow({ where: { id: batchId } });
  const rows = await prisma.contentImportRow.findMany({
    where: { batchId, status: { in: ["VALID", "WARNING"] } },
    orderBy: { rowNumber: "asc" },
  });

  const seen = new Set<string>();
  const setsToCreate: NormalizedImportRow[] = [];
  for (const r of rows) {
    // VALID/WARNING rows always still have rawData at this point — it's
    // only cleared once a row transitions to IMPORTED (see importBatchChunk).
    const row = r.rawData as unknown as NormalizedImportRow;
    if (!row.contentSetExternalId || seen.has(row.contentSetExternalId)) continue;
    if (row.passageText || row.audioUrl || row.imageUrl) {
      seen.add(row.contentSetExternalId);
      setsToCreate.push(row);
    }
  }

  if (batch.exam === "SAT") {
    await prisma.satContentSet.createMany({
      skipDuplicates: true,
      data: setsToCreate.map((row) => ({
        section: row.section as never,
        externalId: row.contentSetExternalId,
        passageTitle: row.passageTitle || null,
        passage: row.passageText || null,
        imageUrl: row.imageUrl || null,
        status: "DRAFT",
        sourceType: (row.sourceType || "ORIGINAL_SMARTPREP_QUESTION") as never,
        author: row.author || null,
        license: row.license || null,
        sourceReference: row.sourceReference || null,
        createdByAi: parseBoolean(row.createdByAi),
        importBatchId: batchId,
        createdById: batch.createdById,
      })),
    });
  } else {
    await prisma.toeflContentSet.createMany({
      skipDuplicates: true,
      data: setsToCreate.map((row) => ({
        skill: row.section as never,
        externalId: row.contentSetExternalId,
        passageTitle: row.passageTitle || null,
        passage: row.passageText || null,
        audioUrl: row.audioUrl || null,
        transcript: row.audioTranscript || null,
        imageUrl: row.imageUrl || null,
        status: "DRAFT",
        sourceType: (row.sourceType || "ORIGINAL_SMARTPREP_QUESTION") as never,
        author: row.author || null,
        license: row.license || null,
        sourceReference: row.sourceReference || null,
        createdByAi: parseBoolean(row.createdByAi),
        importBatchId: batchId,
        createdById: batch.createdById,
      })),
    });
  }

  return { contentSetsPrepared: setsToCreate.length };
}

async function contentSetIdMap(exam: InternationalExamProduct, importBatchId: string): Promise<Map<string, string>> {
  if (exam === "SAT") {
    const sets = await prisma.satContentSet.findMany({
      where: { importBatchId },
      select: { id: true, section: true, externalId: true },
    });
    return new Map(sets.map((s) => [`${s.section}::${s.externalId}`, s.id]));
  }
  const sets = await prisma.toeflContentSet.findMany({
    where: { importBatchId },
    select: { id: true, skill: true, externalId: true },
  });
  return new Map(sets.map((s) => [`${s.skill}::${s.externalId}`, s.id]));
}

export type ImportChunkResult = { importedInChunk: number; done: boolean; nextCursor: string | null };

/** Imports the next chunk of VALID/WARNING rows, always creating content
 * at status DRAFT. Idempotent per chunk: only rows still VALID/WARNING (not
 * yet IMPORTED) are touched, so a retried call with the same cursor can't
 * double-insert. Sequential calls only — the caller (a client-driven
 * progress loop) must not fire overlapping chunk requests. */
export async function importBatchChunk(
  batchId: string,
  cursor: string | null,
  chunkSize = IMPORT_CHUNK_DEFAULT
): Promise<ImportChunkResult> {
  const batch = await prisma.contentImportBatch.findUniqueOrThrow({ where: { id: batchId } });
  if (batch.status !== "IMPORTING" && batch.status !== "VALIDATED") {
    throw new Error(`Batch is not importable — status is ${batch.status}.`);
  }
  if (batch.status === "VALIDATED") {
    await prisma.contentImportBatch.update({ where: { id: batchId }, data: { status: "IMPORTING" } });
  }

  const rows = await prisma.contentImportRow.findMany({
    where: { batchId, status: { in: ["VALID", "WARNING"] } },
    orderBy: { id: "asc" },
    take: chunkSize,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  if (rows.length === 0) {
    await prisma.contentImportBatch.update({ where: { id: batchId }, data: { status: "COMPLETED" } });
    return { importedInChunk: 0, done: true, nextCursor: null };
  }

  const setIds = await contentSetIdMap(batch.exam, batchId);

  const items = rows.map((r) => {
    const row = r.rawData as unknown as NormalizedImportRow;
    const contentId = randomUUID();
    const contentSetId = row.contentSetExternalId ? (setIds.get(`${row.section}::${row.contentSetExternalId}`) ?? null) : null;
    return { rowId: r.id, contentId, row, contentSetId };
  });

  if (batch.exam === "SAT") {
    await prisma.satContent.createMany({
      data: items.map(({ contentId, row, contentSetId }) => {
        const isMcq = (row.questionType || "MULTIPLE_CHOICE") !== "STUDENT_PRODUCED_RESPONSE";
        return {
          id: contentId,
          section: row.section as never,
          domain: row.domain,
          skill: row.skill || null,
          questionType: row.questionType || "MULTIPLE_CHOICE",
          difficulty: (row.difficulty || "MEDIUM") as never,
          status: "DRAFT",
          externalId: row.externalId || null,
          contentSetId,
          order: row.contentSetOrder ? Number(row.contentSetOrder) : null,
          passage: row.passageText || null,
          imageUrl: row.imageUrl || null,
          prompt: row.prompt,
          options: isMcq ? (row.options as never) : undefined,
          correctOption: isMcq ? row.correctOption || null : null,
          correctValue: isMcq ? null : row.correctValue || null,
          explanation: row.explanation || null,
          calculatorAllowed: row.calculatorAllowed ? parseBoolean(row.calculatorAllowed) : null,
          estimatedTimeSec: row.estimatedTimeSec ? Number(row.estimatedTimeSec) : null,
          tags: parseTags(row.tags),
          sourceType: (row.sourceType || "ORIGINAL_SMARTPREP_QUESTION") as never,
          author: row.author || null,
          license: row.license || null,
          sourceReference: row.sourceReference || null,
          createdByAi: parseBoolean(row.createdByAi),
          importBatchId: batchId,
          createdById: batch.createdById,
        };
      }),
    });
  } else {
    await prisma.toeflContent.createMany({
      data: items.map(({ contentId, row, contentSetId }) => ({
        id: contentId,
        skill: row.section as never,
        taskType: row.skill || row.section,
        difficulty: (row.difficulty || "MEDIUM") as never,
        status: "DRAFT",
        externalId: row.externalId || null,
        contentSetId,
        order: row.contentSetOrder ? Number(row.contentSetOrder) : null,
        passage: row.passageText || null,
        audioUrl: row.audioUrl || null,
        transcript: row.audioTranscript || null,
        prompt: row.prompt,
        options: row.options.length > 0 ? (row.options as never) : undefined,
        correctOption: row.correctOption || null,
        explanation: row.explanation || null,
        estimatedTimeSec: row.estimatedTimeSec ? Number(row.estimatedTimeSec) : null,
        tags: parseTags(row.tags),
        sourceType: (row.sourceType || "ORIGINAL_SMARTPREP_QUESTION") as never,
        author: row.author || null,
        license: row.license || null,
        sourceReference: row.sourceReference || null,
        createdByAi: parseBoolean(row.createdByAi),
        importBatchId: batchId,
        createdById: batch.createdById,
      })),
    });
  }

  await prisma.$transaction(
    items.map(({ rowId, contentId }) =>
      prisma.contentImportRow.update({
        where: { id: rowId },
        data: { status: "IMPORTED", contentId, rawData: Prisma.DbNull },
      })
    )
  );

  await prisma.contentImportBatch.update({
    where: { id: batchId },
    data: { importedRecords: { increment: items.length } },
  });

  const nextCursor = rows[rows.length - 1].id;
  const done = rows.length < chunkSize;
  if (done) {
    await prisma.contentImportBatch.update({ where: { id: batchId }, data: { status: "COMPLETED" } });
  }

  return { importedInChunk: items.length, done, nextCursor: done ? null : nextCursor };
}

export async function publishBatch(batchId: string) {
  const batch = await prisma.contentImportBatch.findUniqueOrThrow({ where: { id: batchId } });
  if (batch.exam === "SAT") {
    await prisma.satContent.updateMany({ where: { importBatchId: batchId, status: "DRAFT" }, data: { status: "PUBLISHED" } });
    await prisma.satContentSet.updateMany({ where: { importBatchId: batchId, status: "DRAFT" }, data: { status: "PUBLISHED" } });
  } else {
    await prisma.toeflContent.updateMany({ where: { importBatchId: batchId, status: "DRAFT" }, data: { status: "PUBLISHED" } });
    await prisma.toeflContentSet.updateMany({ where: { importBatchId: batchId, status: "DRAFT" }, data: { status: "PUBLISHED" } });
  }
}

/** Removes only the content and content sets this batch created, via the
 * importBatchId FK — never touches any other batch's rows. */
export async function rollbackBatch(batchId: string) {
  const batch = await prisma.contentImportBatch.findUniqueOrThrow({ where: { id: batchId } });
  if (batch.exam === "SAT") {
    await prisma.$transaction([
      prisma.satContent.deleteMany({ where: { importBatchId: batchId } }),
      prisma.satContentSet.deleteMany({ where: { importBatchId: batchId } }),
      prisma.contentImportBatch.update({ where: { id: batchId }, data: { status: "ROLLED_BACK", rolledBackAt: new Date() } }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.toeflContent.deleteMany({ where: { importBatchId: batchId } }),
      prisma.toeflContentSet.deleteMany({ where: { importBatchId: batchId } }),
      prisma.contentImportBatch.update({ where: { id: batchId }, data: { status: "ROLLED_BACK", rolledBackAt: new Date() } }),
    ]);
  }
}
