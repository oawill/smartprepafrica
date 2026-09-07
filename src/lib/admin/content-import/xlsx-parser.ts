import ExcelJS from "exceljs";

/** Parses an uploaded XLSX file's first worksheet into header->value
 * records. Uses exceljs (not the `xlsx`/SheetJS community package, which
 * has known unpatched CVEs and this reads untrusted admin-uploaded files)
 * with its standard buffer loader — exceljs's streaming reader had
 * compatibility problems with an in-memory buffer produced by its own
 * writer, so this trades true streaming for reliability; a 90MB (the
 * upload cap) XLSX file loads comfortably within Fluid Compute's memory
 * budget. */
export async function parseXlsxRecords(buffer: Buffer): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const records: Record<string, string>[] = [];
  let header: string[] = [];

  sheet.eachRow((row, rowNumber) => {
    const values = row.values as (string | number | boolean | Date | null | undefined)[];
    const cells = values.slice(1).map((v) => (v === null || v === undefined ? "" : String(v).trim()));

    if (rowNumber === 1) {
      header = cells;
      return;
    }
    if (cells.every((c) => c.length === 0)) return;

    const record: Record<string, string> = {};
    header.forEach((name, i) => {
      record[name] = cells[i] ?? "";
    });
    records.push(record);
  });

  return records;
}
