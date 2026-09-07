import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/admin/permissions";
import { logAudit } from "@/lib/admin/audit";
import { createBatch, persistParsedRows } from "@/lib/admin/content-import/batch-service";
import { parseCsvRecords } from "@/lib/admin/content-import/csv-parser";
import { parseXlsxRecords } from "@/lib/admin/content-import/xlsx-parser";
import { parseJsonRecords, ImportJsonError } from "@/lib/admin/content-import/json-parser";

const MAX_UPLOAD_BYTES = 90 * 1024 * 1024; // stay under Vercel's 100MB request body limit

/** File upload+parse for SAT/TOEFL bulk import. A Route Handler rather
 * than a Server Action deliberately — passing a 50-150MB file through
 * Server Action (Flight) argument serialization isn't what that transport
 * is built for. The client only ever gets back { batchId, totalRows };
 * parsed rows never round-trip to the browser. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only platform administrators can do that." }, { status: 401 });
  }

  const formData = await request.formData();
  const exam = formData.get("exam") as string | null;
  const format = formData.get("format") as string | null;
  const file = formData.get("file") as File | null;

  if (exam !== "SAT" && exam !== "TOEFL") {
    return NextResponse.json({ error: "exam must be SAT or TOEFL." }, { status: 400 });
  }
  if (format !== "CSV" && format !== "XLSX" && format !== "JSON") {
    return NextResponse.json({ error: "format must be CSV, XLSX, or JSON." }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  const permission: Permission = exam === "SAT" ? "sat.bulk_import" : "toefl.bulk_import";
  if (!hasPermission(session.user.adminRole, permission)) {
    await logAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role as Role,
      action: `PERMISSION_DENIED:${permission}`,
      resourceType: "Permission",
      resourceId: permission,
      result: "DENIED",
    });
    return NextResponse.json({ error: "Your admin role does not have permission to do that." }, { status: 403 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `File is too large (${Math.round(file.size / 1024 / 1024)}MB, max 90MB).` }, { status: 400 });
  }

  let records: Record<string, string>[];
  try {
    if (format === "CSV") {
      records = parseCsvRecords(await file.text());
    } else if (format === "JSON") {
      records = parseJsonRecords(await file.text());
    } else {
      records = await parseXlsxRecords(Buffer.from(await file.arrayBuffer()));
    }
  } catch (err) {
    const message = err instanceof ImportJsonError ? err.message : "Could not parse the uploaded file.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (records.length === 0) {
    return NextResponse.json({ error: "The file has no data rows." }, { status: 400 });
  }

  const batch = await createBatch({ exam, format, filename: file.name, createdById: session.user.id });
  await persistParsedRows(batch.id, records);

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role as Role,
    action: "CONTENT_IMPORT_UPLOADED",
    resourceType: "ContentImportBatch",
    resourceId: batch.id,
    result: "SUCCESS",
    after: { exam, format, filename: file.name, totalRecords: records.length },
  });

  return NextResponse.json({ batchId: batch.id, totalRows: records.length });
}
