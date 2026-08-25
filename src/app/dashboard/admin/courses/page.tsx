import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { approveCourse, rejectCourse, suspendCourse, toggleFeatured } from "@/app/dashboard/admin/courses/actions";

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "warning",
  UNDER_REVIEW: "warning",
  APPROVED: "info",
  PUBLISHED: "success",
  REJECTED: "danger",
  NEEDS_CHANGES: "warning",
  SUSPENDED: "danger",
};

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminPagePermission("courses.view");
  const { status } = await searchParams;

  const courses = await prisma.course.findMany({
    where: status ? { moderationStatus: status as never } : {},
    include: {
      teacher: { select: { user: { select: { name: true } } } },
      school: { select: { name: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">Courses</h1>
          <p className="mt-1 text-sm text-text-secondary">Moderate SmartPrepAfrica.com courses — approve, reject, suspend, or feature.</p>
        </div>
        <form className="flex gap-2">
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
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
          <button type="submit" className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted">
            Filter
          </button>
        </form>
      </div>

      <div className="mt-6 space-y-3">
        {courses.map((c) => (
          <Card key={c.id} title={c.title}>
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span>
                {c.teacher?.user.name ?? c.school?.name ?? "SmartPrepAfrica"} · {c._count.enrollments} learners
              </span>
              <Badge tone={STATUS_TONE[c.moderationStatus] ?? "neutral"}>{c.moderationStatus}</Badge>
              {c.featured && <Badge tone="brand" icon={null}>★ Featured</Badge>}
            </div>
            {c.moderationReason && (
              <p className="mt-1 text-xs text-text-muted">Reason on file: {c.moderationReason}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {c.moderationStatus !== "APPROVED" && (
                <form action={approveCourse}>
                  <input type="hidden" name="courseId" value={c.id} />
                  <button type="submit" className="rounded-lg border border-success/40 px-3 py-1.5 text-xs text-success hover:border-success">
                    Approve
                  </button>
                </form>
              )}
              <form action={rejectCourse} className="flex gap-1">
                <input type="hidden" name="courseId" value={c.id} />
                <input
                  name="reason"
                  placeholder="Reason to reject…"
                  className="w-40 rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                />
                <button type="submit" className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:border-danger">
                  Reject
                </button>
              </form>
              <form action={suspendCourse} className="flex gap-1">
                <input type="hidden" name="courseId" value={c.id} />
                <input
                  name="reason"
                  placeholder="Reason to suspend…"
                  className="w-40 rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                />
                <button type="submit" className="rounded-lg border border-warning/40 px-3 py-1.5 text-xs text-warning hover:border-warning">
                  Suspend
                </button>
              </form>
              <form action={toggleFeatured}>
                <input type="hidden" name="courseId" value={c.id} />
                <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
                  {c.featured ? "Unfeature" : "Feature"}
                </button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
