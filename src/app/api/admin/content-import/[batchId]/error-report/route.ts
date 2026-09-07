import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

/** Downloadable error report, generated on demand from ContentImportRow —
 * never pre-rendered/stored, since it's cheap to regenerate and only ever
 * needed for rows still needing admin attention. */
export async function GET(_request: Request, context: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await context.params;
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only platform administrators can do that." }, { status: 401 });
  }

  const batch = await prisma.contentImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) return NextResponse.json({ error: "Import batch not found." }, { status: 404 });

  const permission: Permission = batch.exam === "SAT" ? "sat.bulk_import" : "toefl.bulk_import";
  if (!hasPermission(session.user.adminRole, permission)) {
    return NextResponse.json({ error: "Your admin role does not have permission to do that." }, { status: 403 });
  }

  const rows = await prisma.contentImportRow.findMany({
    where: { batchId, status: { in: ["ERROR", "WARNING", "DUPLICATE"] } },
    orderBy: { rowNumber: "asc" },
  });

  const csvRows: (string | number)[][] = [
    ["row_number", "status", "messages", "question_id", "question_text"],
    ...rows.map((r) => {
      const raw = (r.rawData ?? {}) as Record<string, string>;
      return [r.rowNumber, r.status, r.messages.join(" | "), raw.question_id ?? "", raw.question_text ?? ""];
    }),
  ];

  return new NextResponse(toCsv(csvRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${batch.exam.toLowerCase()}-import-${batchId}-errors.csv"`,
    },
  });
}
