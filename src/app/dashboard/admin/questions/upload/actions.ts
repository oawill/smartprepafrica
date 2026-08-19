"use server";

import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import { generateQuestionNumber } from "@/lib/admin/ids";
import {
  parseQuotedCsv,
  rowsToObjects,
  validateRow,
  type ParsedQuestionRow,
  type RowValidation,
} from "@/lib/admin/question-csv";

async function subjectIdMap() {
  const subjects = await prisma.subject.findMany();
  return new Map(subjects.map((s) => [s.name.trim().toLowerCase(), s.id]));
}

async function flagDuplicates(rows: ParsedQuestionRow[], subjectIdByName: Map<string, string>) {
  const duplicateOfId = new Map<number, string>();
  for (const row of rows) {
    const subjectId = subjectIdByName.get(row.subjectName.trim().toLowerCase());
    if (!subjectId || !row.prompt) continue;
    const normalized = row.prompt.trim().toLowerCase();
    const existing = await prisma.question.findFirst({
      where: { subjectId, exam: row.exam as never, prompt: { equals: row.prompt.trim(), mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      duplicateOfId.set(row.rowNumber, existing.id);
      continue;
    }
    const seenBefore = rows.find(
      (r) =>
        r.rowNumber < row.rowNumber &&
        r.subjectName.trim().toLowerCase() === row.subjectName.trim().toLowerCase() &&
        r.exam === row.exam &&
        r.prompt.trim().toLowerCase() === normalized
    );
    if (seenBefore) duplicateOfId.set(row.rowNumber, `row-${seenBefore.rowNumber}`);
  }
  return duplicateOfId;
}

export type BulkRowResult = {
  rowNumber: number;
  status: "OK" | "WARNING" | "ERROR";
  messages: string[];
  exam: string;
  subjectName: string;
  prompt: string;
  duplicateOfId: string | null;
  outcome?: "IMPORTED" | "SKIPPED";
};

export async function validateBulkUpload(csvText: string): Promise<BulkRowResult[]> {
  await requireActionPermission("questions.bulk_upload");

  const rows = rowsToObjects(parseQuotedCsv(csvText));
  const subjectIdByName = await subjectIdMap();
  const duplicates = await flagDuplicates(rows, subjectIdByName);

  return rows.map((row) => {
    const validation: RowValidation = validateRow(row, subjectIdByName);
    const duplicateOfId = duplicates.get(row.rowNumber) ?? null;
    const messages = duplicateOfId
      ? [...validation.messages, "Possible duplicate of an existing question."]
      : validation.messages;
    return {
      rowNumber: row.rowNumber,
      status: duplicateOfId && validation.status === "OK" ? "WARNING" : validation.status,
      messages,
      exam: row.exam,
      subjectName: row.subjectName,
      prompt: row.prompt,
      duplicateOfId,
    };
  });
}

export async function commitBulkUpload(csvText: string): Promise<{
  importedCount: number;
  skippedCount: number;
  results: BulkRowResult[];
}> {
  const session = await requireActionPermission("questions.bulk_upload");

  const rows = rowsToObjects(parseQuotedCsv(csvText));
  const subjectIdByName = await subjectIdMap();
  const duplicates = await flagDuplicates(rows, subjectIdByName);

  const results: BulkRowResult[] = [];
  let importedCount = 0;

  for (const row of rows) {
    const validation = validateRow(row, subjectIdByName);
    const duplicateOfIdRaw = duplicates.get(row.rowNumber) ?? null;
    const duplicateOfId = duplicateOfIdRaw?.startsWith("row-") ? null : duplicateOfIdRaw;

    if (validation.status === "ERROR") {
      results.push({
        rowNumber: row.rowNumber,
        status: "ERROR",
        messages: validation.messages,
        exam: row.exam,
        subjectName: row.subjectName,
        prompt: row.prompt,
        duplicateOfId,
        outcome: "SKIPPED",
      });
      continue;
    }

    const subjectId = subjectIdByName.get(row.subjectName.trim().toLowerCase())!;
    const questionNumber = await generateQuestionNumber();
    await prisma.question.create({
      data: {
        exam: row.exam as never,
        subjectId,
        topic: row.topic || null,
        subtopic: row.subtopic || null,
        grade: row.grade || null,
        year: row.year ? Number(row.year) : null,
        difficulty: (row.difficulty || "MEDIUM") as never,
        prompt: row.prompt,
        imageUrl: row.imageUrl || null,
        options: row.options as never,
        correctOption: row.correctOption,
        explanation: row.explanation || null,
        sourceType: (row.sourceType || "IMPORTED") as never,
        questionNumber,
        status: "DRAFT",
        createdById: session.user.id,
        duplicateOfId,
      },
    });
    importedCount++;
    results.push({
      rowNumber: row.rowNumber,
      status: validation.status,
      messages: validation.messages,
      exam: row.exam,
      subjectName: row.subjectName,
      prompt: row.prompt,
      duplicateOfId,
      outcome: "IMPORTED",
    });
  }

  const skippedCount = results.length - importedCount;

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTIONS_BULK_IMPORTED",
    resourceType: "Question",
    result: "SUCCESS",
    after: { importedCount, skippedCount, totalRows: rows.length },
  });

  return { importedCount, skippedCount, results };
}
