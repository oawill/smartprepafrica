import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { formatNaira } from "@/lib/plans";
import { cancelRenderJobAction, retryRenderJobAction } from "@/app/dashboard/admin/video-studio/[id]/actions";

const RENDER_TONE: Record<string, BadgeTone> = {
  QUEUED: "neutral",
  RENDERING: "info",
  COMPLETE: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

const YOUTUBE_TONE: Record<string, BadgeTone> = {
  UPLOADING: "info",
  UPLOADED: "success",
  FAILED: "danger",
};

type QueueRow = {
  id: string;
  projectId: string;
  projectTitle: string;
  operation: string;
  statusLabel: string;
  statusTone: BadgeTone;
  detail: string;
  cost: string;
  when: Date;
  durationLabel: string;
  renderJob?: { id: string; status: string };
};

export default async function ProductionQueuePage() {
  const session = await requireAdminPagePermission("video_studio.view");
  const canManage = hasPermission(session.user.adminRole, "video_studio.create");

  const [generationJobs, renderJobs, youtubeUploads] = await Promise.all([
    prisma.videoGenerationLog.findMany({
      include: { project: { select: { id: true, title: true } } },
      orderBy: { startedAt: "desc" },
      take: 100,
    }),
    prisma.videoRenderJob.findMany({
      include: { project: { select: { id: true, title: true } } },
      orderBy: { queuedAt: "desc" },
      take: 100,
    }),
    prisma.videoProject.findMany({
      where: { youtubeUploadStatus: { not: "NOT_STARTED" } },
      select: { id: true, title: true, youtubeUploadStatus: true, youtubeUploadError: true, youtubeVideoId: true, youtubePublishedAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  const rows: QueueRow[] = [
    ...generationJobs.map((job): QueueRow => {
      const durationMs = job.completedAt ? job.completedAt.getTime() - job.startedAt.getTime() : null;
      return {
        id: `gen-${job.id}`,
        projectId: job.projectId,
        projectTitle: job.project.title,
        operation: job.stage.replaceAll("_", " "),
        statusLabel: job.status,
        statusTone: job.status === "SUCCEEDED" ? "success" : "danger",
        detail:
          job.inputTokens + job.outputTokens > 0
            ? `${job.provider} · ${job.model} · ${job.inputTokens} in / ${job.outputTokens} out`
            : job.characterCount
              ? `${job.provider} · ${job.model} · ${job.characterCount} chars`
              : `${job.provider} · ${job.model}`,
        cost: job.estimatedCostKobo > 0 ? formatNaira(job.estimatedCostKobo) : "—",
        when: job.startedAt,
        durationLabel: durationMs !== null ? `${(durationMs / 1000).toFixed(1)}s` : "—",
      };
    }),
    ...renderJobs.map((job): QueueRow => {
      const durationMs = job.completedAt && job.startedAt ? job.completedAt.getTime() - job.startedAt.getTime() : null;
      return {
        id: `render-${job.id}`,
        projectId: job.projectId,
        projectTitle: job.project.title,
        operation: "RENDER",
        statusLabel: job.status === "RENDERING" ? `${job.status} ${job.progressPercent}%` : job.status,
        statusTone: RENDER_TONE[job.status],
        detail: job.retryCount > 0 ? `retry ${job.retryCount}` : "—",
        cost: "—",
        when: job.queuedAt,
        durationLabel: durationMs !== null ? `${(durationMs / 1000).toFixed(1)}s` : "—",
        renderJob: { id: job.id, status: job.status },
      };
    }),
    ...youtubeUploads.map((project): QueueRow => ({
      id: `yt-${project.id}`,
      projectId: project.id,
      projectTitle: project.title,
      operation: "YOUTUBE UPLOAD",
      statusLabel: project.youtubeUploadStatus,
      statusTone: YOUTUBE_TONE[project.youtubeUploadStatus] ?? "neutral",
      detail: project.youtubeUploadStatus === "FAILED" ? (project.youtubeUploadError ?? "—") : project.youtubeVideoId ?? "—",
      cost: "—",
      when: project.youtubePublishedAt ?? project.updatedAt,
      durationLabel: "—",
    })),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">Production Queue</h1>
      <p className="mt-1 text-sm text-text-secondary">Real jobs across script generation, voice generation, rendering, and YouTube upload.</p>

      <div className="mt-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2 pr-3">Project</th>
                  <th className="pb-2 pr-3">Operation</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Detail</th>
                  <th className="pb-2 pr-3">Est. cost</th>
                  <th className="pb-2 pr-3">Started</th>
                  <th className="pb-2 pr-3">Duration</th>
                  <th className="pb-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2 pr-3">
                      <Link href={`/dashboard/admin/video-studio/${row.projectId}`} className="text-text-primary hover:text-brand-text">
                        {row.projectTitle}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">{row.operation}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={row.statusTone}>{row.statusLabel}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">{row.detail}</td>
                    <td className="py-2 pr-3 text-text-secondary">{row.cost}</td>
                    <td className="py-2 pr-3 text-text-secondary">{row.when.toLocaleString("en-NG")}</td>
                    <td className="py-2 pr-3 text-text-secondary">{row.durationLabel}</td>
                    <td className="py-2 pr-3">
                      {canManage && row.renderJob?.status === "QUEUED" && (
                        <form action={cancelRenderJobAction.bind(null, row.renderJob.id)}>
                          <button type="submit" className="text-xs text-danger hover:underline">
                            Cancel
                          </button>
                        </form>
                      )}
                      {canManage && row.renderJob?.status === "FAILED" && (
                        <form action={retryRenderJobAction.bind(null, row.renderJob.id)}>
                          <button type="submit" className="text-xs text-brand-text hover:underline">
                            Retry
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="py-6 text-center text-sm text-text-muted">No jobs yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
