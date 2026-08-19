import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

const statusColor: Record<string, string> = {
  DRAFT: "text-slate-400",
  NEEDS_REVIEW: "text-amber-400",
  APPROVED: "text-blue-400",
  PUBLISHED: "text-green-400",
  ARCHIVED: "text-slate-600",
};

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    exam?: string;
    subjectId?: string;
    page?: string;
  }>;
}) {
  await requireAdminPagePermission("questions.view");

  const params = await searchParams;
  const q = params.q?.trim();
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.QuestionWhereInput = {
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.exam ? { exam: params.exam as never } : {}),
    ...(params.subjectId ? { subjectId: params.subjectId } : {}),
    ...(q
      ? {
          OR: [
            { prompt: { contains: q, mode: "insensitive" } },
            { questionNumber: { contains: q, mode: "insensitive" } },
            { topic: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, questions, subjects] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      include: { subject: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { q, status: params.status, exam: params.exam, subjectId: params.subjectId, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    return `/dashboard/admin/questions?${sp.toString()}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Questions</h1>
          <p className="mt-1 text-sm text-slate-400">{total} total — {PAGE_SIZE} shown per page.</p>
        </div>
        <Link
          href="/dashboard/admin/questions/new"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
        >
          + New question
        </Link>
      </div>

      <div className="mt-6">
        <Card title="Search & filter">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Text, question ID, topic…"
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
        <Card title={`${questions.length} question${questions.length === 1 ? "" : "s"} on this page`}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="pb-2">ID</th>
                <th className="pb-2">Subject / exam</th>
                <th className="pb-2">Topic</th>
                <th className="pb-2">Difficulty</th>
                <th className="pb-2">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr key={question.id} className="border-t border-slate-800">
                  <td className="py-2 font-mono text-xs text-slate-500">{question.questionNumber ?? "—"}</td>
                  <td className="py-2 text-slate-300">
                    {question.subject.name} · {question.exam}
                  </td>
                  <td className="py-2 text-slate-400">{question.topic ?? "—"}</td>
                  <td className="py-2 text-slate-400">{question.difficulty}</td>
                  <td className={`py-2 ${statusColor[question.status] ?? ""}`}>
                    {question.status}
                    {question.duplicateOfId && (
                      <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                        possible duplicate
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <Link
                      href={`/dashboard/admin/questions/${question.id}`}
                      className="text-xs text-orange-400 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
