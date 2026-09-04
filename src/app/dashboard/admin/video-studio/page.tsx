import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { isVideoAiConfigured } from "@/lib/ai/video/provider";

const STAT_GROUPS: { label: string; statuses: string[] }[] = [
  { label: "Drafts", statuses: ["DRAFT"] },
  { label: "Awaiting review", statuses: ["NEEDS_REVIEW"] },
  { label: "Ready to render", statuses: ["SCRIPT_APPROVED", "READY_TO_RENDER"] },
  { label: "Rendering", statuses: ["RENDERING"] },
  { label: "Completed", statuses: ["RENDER_COMPLETE", "FINAL_REVIEW", "APPROVED", "READY_TO_PUBLISH"] },
  { label: "Published", statuses: ["PUBLISHED"] },
];

export default async function VideoStudioDashboard() {
  await requireAdminPagePermission("video_studio.view");

  const [totalProjects, statusCounts] = await Promise.all([
    prisma.videoProject.count(),
    prisma.videoProject.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countByStatus = new Map(statusCounts.map((s) => [s.status, s._count._all]));
  const groupCount = (statuses: string[]) => statuses.reduce((sum, s) => sum + (countByStatus.get(s as never) ?? 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-text-primary">Video Learning Studio</h1>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            Create curriculum-aligned educational videos for SmartPrepAfrica and YouTube.
          </p>
        </div>
        <Link
          href="/dashboard/admin/video-studio/new"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          + Create Video
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link
          href="/dashboard/admin/video-studio/library"
          className="rounded-lg border border-border-strong px-4 py-2 text-text-secondary hover:border-text-muted hover:text-text-primary"
        >
          Video Library
        </Link>
        <Link
          href="/dashboard/admin/video-studio/templates"
          className="rounded-lg border border-border-strong px-4 py-2 text-text-secondary hover:border-text-muted hover:text-text-primary"
        >
          Templates
        </Link>
        <Link
          href="/dashboard/admin/video-studio/queue"
          className="rounded-lg border border-border-strong px-4 py-2 text-text-secondary hover:border-text-muted hover:text-text-primary"
        >
          Production Queue
        </Link>
        <Link
          href="/dashboard/admin/video-studio/settings"
          className="rounded-lg border border-border-strong px-4 py-2 text-text-secondary hover:border-text-muted hover:text-text-primary"
        >
          Settings
        </Link>
      </div>

      {!isVideoAiConfigured() && (
        <p className="mt-6 rounded-lg border border-warning/40 bg-warning-surface px-4 py-2 text-sm text-warning">
          AI script generation is not configured — set <code>ANTHROPIC_API_KEY</code> to enable it. You can still
          create projects and author scenes manually.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Total projects">
          <p className="text-3xl font-semibold">{totalProjects}</p>
        </Card>
        {STAT_GROUPS.map((group) => (
          <Card key={group.label} title={group.label}>
            <p className="text-3xl font-semibold">{groupCount(group.statuses)}</p>
          </Card>
        ))}
      </div>

      {totalProjects === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-border-strong p-10 text-center">
          <p className="text-text-secondary">No video projects yet.</p>
          <p className="mt-1 text-sm text-text-muted">
            Start with a curriculum topic — pick a country, exam, subject and topic, and the studio will help you
            build a scene-by-scene script.
          </p>
          <Link
            href="/dashboard/admin/video-studio/new"
            className="mt-4 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Create your first video
          </Link>
        </div>
      )}
    </div>
  );
}
