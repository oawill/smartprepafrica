import { parseQuotedCsv } from "@/lib/admin/question-csv";

/** Parses CSV text into header->value records. Reuses the existing
 * RFC4180-quoted CSV parser from the WAEC/UTME bulk-upload pipeline
 * (question text/explanations routinely contain commas and quotes there
 * too, so the same parser applies unchanged). */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseQuotedCsv(text);
  const [header, ...dataRows] = rows;
  if (!header) return [];
  const normalizedHeader = header.map((h) => h.trim());
  return dataRows.map((cells) => {
    const record: Record<string, string> = {};
    normalizedHeader.forEach((name, i) => {
      record[name] = (cells[i] ?? "").trim();
    });
    return record;
  });
}
