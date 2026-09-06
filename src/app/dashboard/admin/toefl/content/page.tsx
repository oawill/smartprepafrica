import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import type { Prisma, QuestionStatus } from "@prisma/client";

const PAGE_SIZE = 25;

const STATUS_TONE: Record<QuestionStatus, BadgeTone> = {
  DRAFT: "neutral",
  NEEDS_REVIEW: "warning",
  APPROVED: "info",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
};

export default async function AdminToeflContentPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string; status?: string; q?: string; page?: string; error?: string }>;
}) {
  await requireAdminPagePermission("toefl.view");

  const params = await searchParams;
  const q = params.q?.trim();
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.ToeflContentWhereInput = {
    ...(params.skill ? { skill: params.skill as never } : {}),
    ...(params.status ? { status: params.status as never } : {}),
    ...(q ? { prompt: { contains: q, mode: "insensitive" } } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.toeflContent.count({ where }),
    prisma.toeflContent.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { q, skill: params.skill, status: params.status, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    return `/dashboard/admin/toefl/content?${sp.toString()}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">TOEFL Content</h1>
          <p className="mt-1 text-sm text-text-secondary">{total} total — {PAGE_SIZE} shown per page.</p>
        </div>
        <Link
          href="/dashboard/admin/toefl/content/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          + New content
        </Link>
      </div>

      {params.error && (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger-surface px-4 py-3 text-sm text-danger">
          {params.error}
        </div>
      )}

      <div className="mt-6">
        <Card title="Search & filter">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search prompt text…"
              className="min-w-[220px] flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-brand"
            />
            <select
              name="skill"
              defaultValue={params.skill ?? ""}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Any skill</option>
              <option value="READING">Reading</option>
              <option value="LISTENING">Listening</option>
              <option value="WRITING">Writing</option>
              <option value="SPEAKING">Speaking</option>
            </select>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Any status</option>
              <option value="DRAFT">Draft</option>
              <option value="NEEDS_REVIEW">Needs review</option>
              <option value="APPROVED">Approved</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <button
              type="submit"
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Search
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`${items.length} item${items.length === 1 ? "" : "s"} on this page`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-muted">
                  <th className="pb-2 pr-4">Skill</th>
                  <th className="pb-2 pr-4">Task type</th>
                  <th className="pb-2 pr-4">Difficulty</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Prompt</th>
                  <th className="pb-2 pr-4">Updated</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4">{item.skill}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-text-secondary">{item.taskType}</td>
                    <td className="py-2 pr-4">{item.difficulty}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={STATUS_TONE[item.status]}>{item.status.replace("_", " ")}</Badge>
                    </td>
                    <td className="py-2 pr-4 max-w-[280px] truncate text-text-secondary">{item.prompt}</td>
                    <td className="py-2 pr-4 text-text-muted">{item.updatedAt.toLocaleDateString("en-NG")}</td>
                    <td className="py-2">
                      <Link
                        href={`/dashboard/admin/toefl/content/${item.id}`}
                        className="text-xs text-brand-text hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-text-muted">
                      No content matches these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <Link
            href={pageHref({ page: String(Math.max(1, page - 1)) })}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-text-secondary hover:border-text-muted"
          >
            ← Prev
          </Link>
          <span className="text-text-muted">
            Page {page} of {totalPages}
          </span>
          <Link
            href={pageHref({ page: String(Math.min(totalPages, page + 1)) })}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-text-secondary hover:border-text-muted"
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
