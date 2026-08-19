import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { approveCourse, rejectCourse, suspendCourse, toggleFeatured } from "@/app/dashboard/admin/courses/actions";

const statusColor: Record<string, string> = {
  DRAFT: "text-slate-500",
  SUBMITTED: "text-amber-400",
  UNDER_REVIEW: "text-amber-400",
  APPROVED: "text-blue-400",
  PUBLISHED: "text-green-400",
  REJECTED: "text-red-400",
  NEEDS_CHANGES: "text-amber-400",
  SUSPENDED: "text-red-500",
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
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="mt-1 text-sm text-slate-400">Moderate Educom courses — approve, reject, suspend, or feature.</p>
        </div>
        <form className="flex gap-2">
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
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
          <button type="submit" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500">
            Filter
          </button>
        </form>
      </div>

      <div className="mt-6 space-y-3">
        {courses.map((c) => (
          <Card key={c.id} title={c.title}>
            <p className="text-sm text-slate-400">
              {c.teacher?.user.name ?? c.school?.name ?? "SmartPrepAfrica"} · {c._count.enrollments} learners ·{" "}
              <span className={statusColor[c.moderationStatus] ?? ""}>{c.moderationStatus}</span>
              {c.featured && <span className="ml-2 text-amber-400">★ Featured</span>}
            </p>
            {c.moderationReason && (
              <p className="mt-1 text-xs text-slate-500">Reason on file: {c.moderationReason}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {c.moderationStatus !== "APPROVED" && (
                <form action={approveCourse}>
                  <input type="hidden" name="courseId" value={c.id} />
                  <button type="submit" className="rounded-lg border border-green-800 px-3 py-1.5 text-xs text-green-400 hover:border-green-600">
                    Approve
                  </button>
                </form>
              )}
              <form action={rejectCourse} className="flex gap-1">
                <input type="hidden" name="courseId" value={c.id} />
                <input
                  name="reason"
                  placeholder="Reason to reject…"
                  className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-orange-500"
                />
                <button type="submit" className="rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:border-red-700">
                  Reject
                </button>
              </form>
              <form action={suspendCourse} className="flex gap-1">
                <input type="hidden" name="courseId" value={c.id} />
                <input
                  name="reason"
                  placeholder="Reason to suspend…"
                  className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-orange-500"
                />
                <button type="submit" className="rounded-lg border border-amber-800 px-3 py-1.5 text-xs text-amber-400 hover:border-amber-600">
                  Suspend
                </button>
              </form>
              <form action={toggleFeatured}>
                <input type="hidden" name="courseId" value={c.id} />
                <button type="submit" className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500">
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
