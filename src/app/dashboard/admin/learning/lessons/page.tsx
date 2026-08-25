import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { LessonBulkTable, type BulkLessonRow } from "@/components/admin/lesson-bulk-table";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 25;

export default async function AdminLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string; error?: string }>;
}) {
  const session = await requireAdminPagePermission("lessons.view");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.LessonWhereInput = {
    ...(params.status ? { moderationStatus: params.status as never } : {}),
    ...(params.type ? { type: params.type as never } : {}),
  };

  const [total, lessons] = await Promise.all([
    prisma.lesson.count({ where }),
    prisma.lesson.findMany({
      where,
      include: { module: { select: { course: { select: { title: true } } } } },
      orderBy: { id: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canApprove = hasPermission(session.user.adminRole, "lessons.approve");
  const canPublish = hasPermission(session.user.adminRole, "lessons.publish");

  const rows: BulkLessonRow[] = lessons.map((l) => ({
    id: l.id,
    title: l.title,
    type: l.type,
    courseTitle: l.module.course.title,
    topic: l.topic,
    status: l.moderationStatus,
  }));

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Lessons</h1>
          <p className="mt-1 text-sm text-text-secondary">{total} total — {PAGE_SIZE} shown per page.</p>
        </div>
      </div>

      {params.error && (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger-surface px-4 py-3 text-sm text-danger">
          {params.error}
        </div>
      )}

      <div className="mt-6">
        <Card title="Filter">
          <form className="flex flex-wrap gap-2">
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Any status</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="APPROVED">Approved</option>
              <option value="PUBLISHED">Published</option>
              <option value="REJECTED">Rejected</option>
              <option value="NEEDS_CHANGES">Needs changes</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <select
              name="type"
              defaultValue={params.type ?? ""}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Any type</option>
              <option value="VIDEO">Video</option>
              <option value="TEXT">Text</option>
              <option value="QUIZ">Quiz</option>
            </select>
            <button
              type="submit"
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Filter
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`${lessons.length} lesson${lessons.length === 1 ? "" : "s"} on this page`}>
          <LessonBulkTable lessons={rows} canApprove={canApprove} canPublish={canPublish} />
        </Card>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <span className="text-text-muted">
            Page {page} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
