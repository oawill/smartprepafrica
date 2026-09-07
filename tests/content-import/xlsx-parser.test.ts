import { test, describe } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { parseXlsxRecords } from "../../src/lib/admin/content-import/xlsx-parser";

async function buildXlsx(headers: string[], rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("parseXlsxRecords", () => {
  test("parses the first worksheet's header + rows into records", async () => {
    const buffer = await buildXlsx(
      ["question_id", "section", "question_text"],
      [
        ["Q1", "MATH", "What is 2+2?"],
        ["Q2", "MATH", "What is 3+3?"],
      ]
    );
    const records = await parseXlsxRecords(buffer);
    assert.equal(records.length, 2);
    assert.deepEqual(records[0], { question_id: "Q1", section: "MATH", question_text: "What is 2+2?" });
  });

  test("skips fully blank rows", async () => {
    const buffer = await buildXlsx(["question_id"], [["Q1"], ["", ""], ["Q2"]]);
    const records = await parseXlsxRecords(buffer);
    assert.equal(records.length, 2);
  });
});
