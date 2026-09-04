import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { requireAdminPagePermission } from "@/lib/admin/authz";

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  SCRIPT_GENERATING: "info",
  SCRIPT_READY: "info",
  NEEDS_REVIEW: "warning",
  SCRIPT_APPROVED: "success",
  PUBLISHED: "success",
};

export default async function VideoLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; subjectId?: string; videoType?: string; created?: string }>;
}) {
  await requireAdminPagePermission("video_studio.view");
  const { q, status, subjectId, videoType, created } = await searchParams;

  const [projects, subjects] = await Promise.all([
    prisma.videoProject.findMany({
      where: {
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        ...(status ? { status: status as never } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(videoType ? { videoType: videoType as never } : {}),
      },
      include: {
        subject: true,
        countryExam: { include: { country: true, exam: { include: { examBody: true } } } },
        _count: { select: { scenes: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">Video Library</h1>
          <p className="mt-1 text-sm text-text-secondary">{projects.length} project(s).</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/admin/video-studio/new/bulk" className="rounded-full border border-border-strong px-5 py-2 text-sm text-text-secondary hover:border-text-muted">
            Bulk create
          </Link>
          <Link href="/dashboard/admin/video-studio/new" className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
            + Create Video
          </Link>
        </div>
      </div>

      {created && (
        <p className="mt-4 rounded-lg border border-success/40 bg-success-surface px-3 py-2 text-sm text-success">
          {created} draft project{created === "1" ? "" : "s"} created.
        </p>
      )}

      <form className="mt-4 flex flex-wrap gap-2 text-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by title…"
          className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
        />
        <select name="subjectId" defaultValue={subjectId ?? ""} className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-text-primary outline-none focus:border-brand">
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-text-primary outline-none focus:border-brand">
          <option value="">Any status</option>
          {Object.keys(STATUS_TONE).map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border border-border-strong px-4 py-2 text-text-secondary hover:border-text-muted">
          Filter
        </button>
      </form>

      <div className="mt-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2 pr-3"></th>
                  <th className="pb-2 pr-3">Title</th>
                  <th className="pb-2 pr-3">Exam / Country</th>
                  <th className="pb-2 pr-3">Subject / Topic</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 pr-3">Scenes</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 pr-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-sunken text-text-muted">🎬</span>
                    </td>
                    <td className="py-2 pr-3">
                      <Link href={`/dashboard/admin/video-studio/${p.id}`} className="font-medium text-text-primary hover:text-brand-text">
                        {p.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">
                      {p.countryExam.exam.name} · {p.countryExam.country.flag} {p.countryExam.country.name}
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">
                      {p.subject.name} — {p.topic}
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">{p.videoType.replaceAll("_", " ")}</td>
                    <td className="py-2 pr-3 text-text-secondary">{p._count.scenes}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status.replaceAll("_", " ")}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-text-secondary">{p.updatedAt.toLocaleDateString("en-NG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {projects.length === 0 && <p className="py-6 text-center text-sm text-text-muted">No projects match these filters.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
