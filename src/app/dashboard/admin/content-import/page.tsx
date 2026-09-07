import Link from "next/link";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const BATCH_STATUS_TONE: Record<string, BadgeTone> = {
  UPLOADED: "neutral",
  VALIDATING: "info",
  VALIDATED: "info",
  IMPORTING: "info",
  COMPLETED: "success",
  FAILED: "danger",
  ROLLED_BACK: "warning",
};

export default async function ContentImportPage() {
  await requireAdminPagePermission("sat.bulk_import");

  const [batches, satBySection, satByDifficulty, satByType, satByStatus, toeflBySkill, toeflByDifficulty, toeflByType, toeflByStatus] =
    await Promise.all([
      prisma.contentImportBatch.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.satContent.groupBy({ by: ["section"], _count: true }),
      prisma.satContent.groupBy({ by: ["difficulty"], _count: true }),
      prisma.satContent.groupBy({ by: ["questionType"], _count: true }),
      prisma.satContent.groupBy({ by: ["status"], _count: true }),
      prisma.toeflContent.groupBy({ by: ["skill"], _count: true }),
      prisma.toeflContent.groupBy({ by: ["difficulty"], _count: true }),
      prisma.toeflContent.groupBy({ by: ["taskType"], _count: true }),
      prisma.toeflContent.groupBy({ by: ["status"], _count: true }),
    ]);

  const satTotal = satBySection.reduce((sum, g) => sum + g._count, 0);
  const toeflTotal = toeflBySkill.reduce((sum, g) => sum + g._count, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold">SAT & TOEFL question bank</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Real-time counts from the database — nothing on this page is hardcoded.
      </p>

      <div className="mt-4">
        <Link
          href="/dashboard/admin/content-import/new"
          className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Bulk import questions →
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title={`SAT — ${satTotal} question(s)`}>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-text-muted">By section</p>
              {satBySection.map((g) => (
                <div key={g.section} className="flex justify-between text-text-secondary">
                  <span>{g.section}</span>
                  <span>{g._count}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-text-muted">By difficulty</p>
              {satByDifficulty.map((g) => (
                <div key={g.difficulty} className="flex justify-between text-text-secondary">
                  <span>{g.difficulty}</span>
                  <span>{g._count}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-text-muted">By question type</p>
              {satByType.map((g) => (
                <div key={g.questionType} className="flex justify-between text-text-secondary">
                  <span>{g.questionType}</span>
                  <span>{g._count}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-text-muted">By review status</p>
              {satByStatus.map((g) => (
                <div key={g.status} className="flex justify-between text-text-secondary">
                  <span>{g.status}</span>
                  <span>{g._count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title={`TOEFL — ${toeflTotal} question(s)`}>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-text-muted">By skill</p>
              {toeflBySkill.map((g) => (
                <div key={g.skill} className="flex justify-between text-text-secondary">
                  <span>{g.skill}</span>
                  <span>{g._count}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-text-muted">By difficulty</p>
              {toeflByDifficulty.map((g) => (
                <div key={g.difficulty} className="flex justify-between text-text-secondary">
                  <span>{g.difficulty}</span>
                  <span>{g._count}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-text-muted">By task type</p>
              {toeflByType.map((g) => (
                <div key={g.taskType} className="flex justify-between text-text-secondary">
                  <span>{g.taskType}</span>
                  <span>{g._count}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-text-muted">By review status</p>
              {toeflByStatus.map((g) => (
                <div key={g.status} className="flex justify-between text-text-secondary">
                  <span>{g.status}</span>
                  <span>{g._count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Import batches">
          {batches.length === 0 ? (
            <p className="text-sm text-text-secondary">No imports yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-text-muted">
                  <tr>
                    <th className="px-3 py-2">Filename</th>
                    <th className="px-3 py-2">Exam</th>
                    <th className="px-3 py-2">Uploaded</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Imported</th>
                    <th className="px-3 py-2">Errors</th>
                    <th className="px-3 py-2">Duplicates</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="px-3 py-2 text-text-secondary">{b.filename}</td>
                      <td className="px-3 py-2 text-text-secondary">{b.exam}</td>
                      <td className="px-3 py-2 text-text-muted">{b.createdAt.toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-text-secondary">{b.totalRecords}</td>
                      <td className="px-3 py-2 text-text-secondary">{b.importedRecords}</td>
                      <td className="px-3 py-2 text-text-secondary">{b.errorRecords}</td>
                      <td className="px-3 py-2 text-text-secondary">{b.duplicateRecords}</td>
                      <td className="px-3 py-2">
                        <Badge tone={BATCH_STATUS_TONE[b.status] ?? "neutral"}>{b.status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/dashboard/admin/content-import/${b.id}`} className="text-brand-text hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
