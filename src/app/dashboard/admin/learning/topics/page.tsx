import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";

/** Read-only QA visibility into CourseTopics — authoring stays with
 * teachers, who own their courses (see admin/learning/lessons for the
 * actual review/publish workflow). */
export default async function AdminTopicsPage() {
  await requireAdminPagePermission("lessons.view");

  const topics = await prisma.courseTopic.findMany({
    include: {
      course: { select: { title: true, subject: { select: { name: true } }, classLevel: { select: { name: true } } } },
      _count: { select: { lessons: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">Topics</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Course topics across all courses, for review visibility. Created and edited by teachers when
        authoring their courses.
      </p>

      <div className="mt-6">
        <Card title={`${topics.length} topic${topics.length === 1 ? "" : "s"}`}>
          {topics.length === 0 ? (
            <p className="text-sm text-text-muted">No course topics yet.</p>
          ) : (
            <div className="space-y-2">
              {topics.map((t) => (
                <div key={t.id} className="rounded-lg border border-border px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">{t.title}</p>
                  <p className="text-xs text-text-muted">
                    <Link href={`/dashboard/admin/courses`} className="hover:underline">
                      {t.course.title}
                    </Link>
                    {t.course.classLevel ? ` · ${t.course.classLevel.name}` : ""}
                    {t.course.subject ? ` · ${t.course.subject.name}` : ""} · {t._count.lessons} lesson
                    {t._count.lessons === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
