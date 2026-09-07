import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { publishBatchAction, rollbackBatchAction } from "@/app/dashboard/admin/content-import/actions";

const ROW_STATUS_TONE: Record<string, BadgeTone> = {
  VALID: "success",
  WARNING: "warning",
  ERROR: "danger",
  DUPLICATE: "neutral",
  IMPORTED: "success",
  PENDING: "info",
};

export default async function ContentImportBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  await requireAdminPagePermission("sat.bulk_import");

  const batch = await prisma.contentImportBatch.findUnique({ where: { id: batchId } });
  if (!batch) notFound();

  const rows = await prisma.contentImportRow.findMany({
    where: { batchId },
    orderBy: { rowNumber: "asc" },
    take: 100,
  });

  const canPublish = batch.status === "COMPLETED" && batch.importedRecords > 0;
  const canRollback = batch.status === "COMPLETED" || batch.status === "FAILED";

  return (
    <div>
      <Link href="/dashboard/admin/content-import" className="text-sm text-text-secondary hover:text-text-primary">
        ← Question bank imports
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{batch.filename}</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {batch.exam} · {batch.format} · uploaded {batch.createdAt.toLocaleString()}
      </p>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <span>Total: {batch.totalRecords}</span>
        <span className="text-success">Valid: {batch.validRecords}</span>
        <span className="text-warning">Warnings: {batch.warningRecords}</span>
        <span className="text-danger">Errors: {batch.errorRecords}</span>
        <span className="text-text-muted">Duplicates: {batch.duplicateRecords}</span>
        <span>Imported: {batch.importedRecords}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone={batch.status === "COMPLETED" ? "success" : batch.status === "ROLLED_BACK" ? "warning" : "info"}>
          {batch.status}
        </Badge>
        {(batch.errorRecords > 0 || batch.warningRecords > 0 || batch.duplicateRecords > 0) && (
          <a
            href={`/api/admin/content-import/${batch.id}/error-report`}
            className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:border-danger"
          >
            Download error report
          </a>
        )}
        {canPublish && (
          <form action={publishBatchAction}>
            <input type="hidden" name="batchId" value={batch.id} />
            <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
              Publish batch
            </button>
          </form>
        )}
        {canRollback && (
          <form action={rollbackBatchAction}>
            <input type="hidden" name="batchId" value={batch.id} />
            <button type="submit" className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:border-danger">
              Rollback batch
            </button>
          </form>
        )}
      </div>

      <div className="mt-6">
        <Card title={`Rows (showing first ${rows.length} of ${batch.totalRecords})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Question</th>
                  <th className="px-3 py-2">Messages</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const raw = (r.rawData ?? {}) as Record<string, string>;
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 text-text-muted">{r.rowNumber}</td>
                      <td className="px-3 py-2">
                        <Badge tone={ROW_STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
                      </td>
                      <td className="max-w-md truncate px-3 py-2 text-text-secondary">
                        {raw.question_text ?? "(imported)"}
                      </td>
                      <td className="px-3 py-2 text-xs text-text-muted">{r.messages.join(" · ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
