import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function AdminPassagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    exam?: string;
    subjectId?: string;
    type?: string;
    page?: string;
    error?: string;
  }>;
}) {
  await requireAdminPagePermission("questions.view");

  const params = await searchParams;
  const q = params.q?.trim();
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.PassageGroupWhereInput = {
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.exam ? { exam: params.exam as never } : {}),
    ...(params.subjectId ? { subjectId: params.subjectId } : {}),
    ...(params.type ? { type: params.type as never } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, passages, subjects] = await Promise.all([
    prisma.passageGroup.count({ where }),
    prisma.passageGroup.findMany({
      where,
      include: { subject: { select: { name: true } }, _count: { select: { questions: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { q, status: params.status, exam: params.exam, subjectId: params.subjectId, type: params.type, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    return `/dashboard/admin/passages?${sp.toString()}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Passages</h1>
          <p className="mt-1 text-sm text-slate-400">
            Shared reading passages for English Comprehension &amp; Literature. {total} total.
          </p>
        </div>
        <Link
          href="/dashboard/admin/passages/new"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
        >
          + New passage
        </Link>
      </div>

      {params.error && (
        <div className="mt-4 rounded-lg border border-red-900 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {params.error}
        </div>
      )}

      <div className="mt-6">
        <Card title="Search & filter">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Title, passage code…"
              className="min-w-[220px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            >
              <option value="">Any status</option>
              <option value="DRAFT">Draft</option>
              <option value="NEEDS_REVIEW">Needs review</option>
              <option value="APPROVED">Approved</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select
              name="exam"
              defaultValue={params.exam ?? ""}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            >
              <option value="">Any exam</option>
              <option value="WAEC">WAEC</option>
              <option value="NECO">NECO</option>
              <option value="UTME">UTME</option>
              <option value="POST_UTME">Post-UTME</option>
            </select>
            <select
              name="subjectId"
              defaultValue={params.subjectId ?? ""}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            >
              <option value="">Any subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              Search
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`${passages.length} passage${passages.length === 1 ? "" : "s"} on this page`}>
          {passages.length === 0 ? (
            <p className="text-sm text-slate-500">No passages match this filter yet.</p>
          ) : (
            <div className="space-y-2">
              {passages.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/admin/passages/${p.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 px-4 py-3 hover:border-slate-600"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {p.title ?? p.code ?? p.id}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.code} · {p.subject.name} · {p.exam} · {p.type.replace(/_/g, " ")} ·{" "}
                      {p._count.questions} question{p._count.questions === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                    {p.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <Link
            href={pageHref({ page: String(Math.max(1, page - 1)) })}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:border-slate-500"
          >
            ← Prev
          </Link>
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Link
            href={pageHref({ page: String(Math.min(totalPages, page + 1)) })}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:border-slate-500"
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
