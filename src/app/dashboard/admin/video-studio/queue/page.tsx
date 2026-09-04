import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge } from "@/components/ui/badge";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { formatNaira } from "@/lib/plans";

export default async function ProductionQueuePage() {
  await requireAdminPagePermission("video_studio.view");

  const jobs = await prisma.videoGenerationLog.findMany({
    include: { project: { select: { id: true, title: true } } },
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">Production Queue</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Real generation jobs — script generation is the only asynchronous operation available in this phase.
        Voice/render/upload jobs appear here once those phases are built.
      </p>

      <div className="mt-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2 pr-3">Project</th>
                  <th className="pb-2 pr-3">Operation</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Provider</th>
                  <th className="pb-2 pr-3">Tokens</th>
                  <th className="pb-2 pr-3">Est. cost</th>
                  <th className="pb-2 pr-3">Started</th>
                  <th className="pb-2 pr-3">Duration</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const durationMs = job.completedAt ? job.completedAt.getTime() - job.startedAt.getTime() : null;
                  return (
                    <tr key={job.id} className="border-t border-border">
                      <td className="py-2 pr-3">
                        <Link href={`/dashboard/admin/video-studio/${job.projectId}`} className="text-text-primary hover:text-brand-text">
                          {job.project.title}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-text-secondary">{job.stage.replaceAll("_", " ")}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={job.status === "SUCCEEDED" ? "success" : "danger"}>{job.status}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-text-secondary">
                        {job.provider} · {job.model}
                      </td>
                      <td className="py-2 pr-3 text-text-secondary">
                        {job.inputTokens + job.outputTokens > 0 ? `${job.inputTokens} in / ${job.outputTokens} out` : "—"}
                      </td>
                      <td className="py-2 pr-3 text-text-secondary">
                        {job.estimatedCostKobo > 0 ? formatNaira(job.estimatedCostKobo) : "—"}
                      </td>
                      <td className="py-2 pr-3 text-text-secondary">{job.startedAt.toLocaleString("en-NG")}</td>
                      <td className="py-2 pr-3 text-text-secondary">{durationMs !== null ? `${(durationMs / 1000).toFixed(1)}s` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {jobs.length === 0 && <p className="py-6 text-center text-sm text-text-muted">No generation jobs yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
