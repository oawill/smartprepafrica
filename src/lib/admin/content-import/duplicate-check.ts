import { prisma } from "@/lib/prisma";
import type { NormalizedImportRow } from "@/lib/admin/content-import/normalize";

const EXTERNAL_ID_CHUNK = 5000;
const PROMPT_CHUNK = 300;

export type DuplicateCheckResult = {
  /** rowNumber -> reason, for rows whose question_id collides with an
   * earlier row in this file or an existing published/draft row in the DB. */
  duplicateExternalId: Map<number, string>;
  /** rowNumber -> reason, for rows whose question text matches an earlier
   * row in this file or an existing row in the DB. */
  duplicatePrompt: Map<number, string>;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Shared implementation — `existingByKey` looks up existing rows keyed by
 * `${section}::${externalId}`, and `findByPrompt` looks up an existing row
 * by exact-insensitive prompt match within a given section. Both are
 * chunked so 100k+ rows never trigger one giant query or N individual ones. */
async function checkDuplicates(
  rows: NormalizedImportRow[],
  existingExternalIds: (ids: string[]) => Promise<{ section: string; externalId: string | null }[]>,
  existingPrompts: (section: string, prompts: string[]) => Promise<{ prompt: string }[]>
): Promise<DuplicateCheckResult> {
  const duplicateExternalId = new Map<number, string>();
  const duplicatePrompt = new Map<number, string>();

  // In-file externalId duplicates.
  const seenExternalId = new Map<string, number>();
  for (const row of rows) {
    if (!row.externalId) continue;
    const key = `${row.section}::${row.externalId}`;
    const firstRow = seenExternalId.get(key);
    if (firstRow) {
      duplicateExternalId.set(row.rowNumber, `Duplicate question_id "${row.externalId}" — already used in row ${firstRow}.`);
    } else {
      seenExternalId.set(key, row.rowNumber);
    }
  }

  // Against-DB externalId duplicates, chunked.
  const externalIds = [...new Set(rows.map((r) => r.externalId).filter(Boolean))];
  for (const idChunk of chunk(externalIds, EXTERNAL_ID_CHUNK)) {
    const existing = await existingExternalIds(idChunk);
    const existingKeys = new Set(existing.map((e) => `${e.section}::${e.externalId}`));
    for (const row of rows) {
      if (!row.externalId || duplicateExternalId.has(row.rowNumber)) continue;
      if (existingKeys.has(`${row.section}::${row.externalId}`)) {
        duplicateExternalId.set(row.rowNumber, `question_id "${row.externalId}" already exists in the question bank.`);
      }
    }
  }

  // In-file prompt duplicates.
  const seenPrompt = new Map<string, number>();
  for (const row of rows) {
    if (!row.prompt) continue;
    const key = `${row.section}::${row.prompt.trim().toLowerCase()}`;
    const firstRow = seenPrompt.get(key);
    if (firstRow) {
      duplicatePrompt.set(row.rowNumber, `This question text matches row ${firstRow}.`);
    } else {
      seenPrompt.set(key, row.rowNumber);
    }
  }

  // Against-DB prompt duplicates, grouped by section and chunked.
  const bySection = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.prompt || duplicatePrompt.has(row.rowNumber)) continue;
    const list = bySection.get(row.section) ?? [];
    list.push(row.prompt.trim());
    bySection.set(row.section, list);
  }
  for (const [section, prompts] of bySection) {
    const uniquePrompts = [...new Set(prompts)];
    for (const promptChunkItems of chunk(uniquePrompts, PROMPT_CHUNK)) {
      const existing = await existingPrompts(section, promptChunkItems);
      const existingSet = new Set(existing.map((e) => e.prompt.trim().toLowerCase()));
      for (const row of rows) {
        if (row.section !== section || !row.prompt || duplicatePrompt.has(row.rowNumber)) continue;
        if (existingSet.has(row.prompt.trim().toLowerCase())) {
          duplicatePrompt.set(row.rowNumber, "This question text already exists in the question bank.");
        }
      }
    }
  }

  return { duplicateExternalId, duplicatePrompt };
}

export async function checkSatDuplicates(rows: NormalizedImportRow[]): Promise<DuplicateCheckResult> {
  return checkDuplicates(
    rows,
    async (ids) =>
      prisma.satContent.findMany({
        where: { externalId: { in: ids } },
        select: { section: true, externalId: true },
      }),
    async (section, prompts) =>
      prisma.satContent.findMany({
        where: { section: section as never, OR: prompts.map((p) => ({ prompt: { equals: p, mode: "insensitive" as const } })) },
        select: { prompt: true },
      })
  );
}

export async function checkToeflDuplicates(rows: NormalizedImportRow[]): Promise<DuplicateCheckResult> {
  return checkDuplicates(
    rows,
    async (ids) =>
      prisma.toeflContent.findMany({
        where: { externalId: { in: ids } },
        select: { skill: true, externalId: true },
      }).then((r) => r.map((x) => ({ section: x.skill, externalId: x.externalId }))),
    async (section, prompts) =>
      prisma.toeflContent.findMany({
        where: { skill: section as never, OR: prompts.map((p) => ({ prompt: { equals: p, mode: "insensitive" as const } })) },
        select: { prompt: true },
      })
  );
}
