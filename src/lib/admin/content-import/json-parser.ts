const MAX_JSON_ROWS = 250_000;

export class ImportJsonError extends Error {}

/** Parses a JSON import file: must be a top-level array of objects using
 * the same snake_case field names as the CSV/XLSX templates (question_id,
 * section, domain, ...). Guards shape and size before doing anything else
 * with the content, since this is untrusted admin-uploaded input. */
export function parseJsonRecords(text: string): Record<string, string>[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportJsonError("The file is not valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new ImportJsonError("The JSON file must contain a top-level array of question objects.");
  }
  if (parsed.length > MAX_JSON_ROWS) {
    throw new ImportJsonError(`The file has ${parsed.length} rows, which exceeds the ${MAX_JSON_ROWS} row limit.`);
  }

  return parsed.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new ImportJsonError(`Row ${index + 1} is not a JSON object.`);
    }
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(entry as Record<string, unknown>)) {
      if (value === null || value === undefined) {
        record[key] = "";
      } else if (typeof value === "object") {
        record[key] = JSON.stringify(value);
      } else {
        record[key] = String(value).trim();
      }
    }
    return record;
  });
}
