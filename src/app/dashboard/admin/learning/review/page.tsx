import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";

const PENDING_STATUSES: ("SUBMITTED" | "UNDER_REVIEW")[] = ["SUBMITTED", "UNDER_REVIEW"];

/** Pure triage view — no mutations here. Approve/reject/publish happens on
 * the respective Course/Lesson detail pages so there's exactly one place
 * each action lives. */
export default async function LearningReviewQueuePage() {
  await requireAdminPagePermission("lessons.approve");

  const [courses, lessons] = await Promise.all([
    prisma.course.findMany({
      where: { moderationStatus: { in: PENDING_STATUSES } },
      include: { teacher: { select: { user: { select: { name: true } } } }, school: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.lesson.findMany({
      where: { moderationStatus: { in: PENDING_STATUSES } },
      include: { module: { select: { course: { select: { title: true } } } } },
      orderBy: { id: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Content review queue</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Courses and lessons awaiting review — {courses.length + lessons.length} item
        {courses.length + lessons.length === 1 ? "" : "s"}.
      </p>

      <div className="mt-6">
        <Card title={`Courses (${courses.length})`}>
          {courses.length === 0 ? (
            <p className="text-sm text-text-muted">Nothing waiting on the course level.</p>
          ) : (
            <div className="space-y-2">
              {courses.map((c) => (
                <Link
                  key={c.id}
                  href="/dashboard/admin/courses"
                  className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 hover:border-border-strong"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{c.title}</p>
                    <p className="text-xs text-text-muted">
                      {c.teacher?.user.name ?? c.school?.name ?? "SmartPrepAfrica"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-warning/40 px-3 py-1 text-xs text-warning">
                    {c.moderationStatus}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`Lessons (${lessons.length})`}>
          {lessons.length === 0 ? (
            <p className="text-sm text-text-muted">Nothing waiting on the lesson level.</p>
          ) : (
            <div className="space-y-2">
              {lessons.map((l) => (
                <Link
                  key={l.id}
                  href={`/dashboard/admin/learning/lessons/${l.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 hover:border-border-strong"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{l.title}</p>
                    <p className="text-xs text-text-muted">{l.module.course.title}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-warning/40 px-3 py-1 text-xs text-warning">
                    {l.moderationStatus}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
