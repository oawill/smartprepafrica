import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/admin/permissions";
import {
  SAT_IMPORT_HEADERS,
  TOEFL_IMPORT_HEADERS,
  generateSatImportTemplate,
  generateToeflImportTemplate,
} from "@/lib/admin/content-import/templates";
import { parseCsvRecords } from "@/lib/admin/content-import/csv-parser";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only platform administrators can do that." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const exam = searchParams.get("exam");
  const format = searchParams.get("format") ?? "CSV";

  if (exam !== "SAT" && exam !== "TOEFL") {
    return NextResponse.json({ error: "exam must be SAT or TOEFL." }, { status: 400 });
  }
  const permission: Permission = exam === "SAT" ? "sat.bulk_import" : "toefl.bulk_import";
  if (!hasPermission(session.user.adminRole, permission)) {
    return NextResponse.json({ error: "Your admin role does not have permission to do that." }, { status: 403 });
  }

  const csvTemplate = exam === "SAT" ? generateSatImportTemplate() : generateToeflImportTemplate();
  const headers = exam === "SAT" ? SAT_IMPORT_HEADERS : TOEFL_IMPORT_HEADERS;
  const filename = `${exam.toLowerCase()}-import-template`;

  if (format === "JSON") {
    const [example] = parseCsvRecords(csvTemplate);
    return new NextResponse(JSON.stringify([example], null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  }

  if (format === "XLSX") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Template");
    sheet.addRow([...headers]);
    const [example] = parseCsvRecords(csvTemplate);
    sheet.addRow(headers.map((h) => example[h] ?? ""));
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  return new NextResponse(csvTemplate, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
