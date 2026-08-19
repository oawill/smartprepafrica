import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function LearnHub({ userId }: { userId: string }) {
  const [enrollments, studentProfile] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            school: { select: { name: true, state: true } },
            modules: {
              orderBy: { order: "asc" },
              select: {
                lessons: { orderBy: { order: "asc" }, select: { id: true, title: true } },
              },
            },
          },
        },
        lessonProgress: {
          where: { completedAt: { not: null } },
          select: { lessonId: true, completedAt: true },
        },
      },
    }),
    prisma.studentProfile.findUnique({
      where: { userId },
      select: { schoolId: true },
    }),
  ]);

  const enrolledCourseIds = new Set(enrollments.map((e) => e.course.id));

  const withProgress = enrollments.map((e) => {
    const allLessons = e.course.modules.flatMap((m) => m.lessons);
    const completedIds = new Set(e.lessonProgress.map((p) => p.lessonId));
    const nextLesson = allLessons.find((l) => !completedIds.has(l.id));
    const lastActivity = e.lessonProgress
      .map((p) => p.completedAt!)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return {
      enrollment: e,
      totalLessons: allLessons.length,
      completedLessons: completedIds.size,
      pct: allLessons.length > 0 ? Math.round((completedIds.size / allLessons.length) * 100) : 0,
      nextLesson,
      lastActivity: lastActivity ?? e.enrolledAt,
    };
  });

  const continueLearning = withProgress
    .filter((w) => w.enrollment.status === "ACTIVE" && w.nextLesson)
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())[0];

  const [newAndRecommended, schoolCourses] = await Promise.all([
    prisma.course.findMany({
      where: { published: true, id: { notIn: [...enrolledCourseIds] } },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, title: true, category: true, school: { select: { name: true, state: true } } },
    }),
    studentProfile?.schoolId
      ? prisma.course.findMany({
          where: {
            published: true,
            schoolId: studentProfile.schoolId,
            id: { notIn: [...enrolledCourseIds] },
          },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
  ]);

  if (enrollments.length === 0 && newAndRecommended.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-6">
      {continueLearning && (
        <div className="rounded-xl border border-orange-800 bg-orange-950/30 p-5">
          <p className="text-xs uppercase tracking-wide text-orange-400">
            Continue learning
          </p>
          <p className="mt-1 text-lg font-medium">{continueLearning.enrollment.course.title}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-orange-500" style={{ width: `${continueLearning.pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-400">{continueLearning.pct}% complete</p>
          <Link
            href={`/educom/${continueLearning.enrollment.course.id}/lessons/${continueLearning.nextLesson!.id}`}
            className="mt-3 inline-block rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
          >
            Continue: {continueLearning.nextLesson!.title}
          </Link>
        </div>
      )}

      {withProgress.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-300">My Learning</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {withProgress.map(({ enrollment, pct }) => (
              <Link
                key={enrollment.id}
                href={`/educom/${enrollment.course.id}`}
                className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm hover:border-slate-600"
              >
                <p className="text-slate-100">{enrollment.course.title}</p>
                {enrollment.course.school && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    Offered by {enrollment.course.school.name}
                    {enrollment.course.school.state && ` — ${enrollment.course.school.state}`}
                  </p>
                )}
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {enrollment.status === "COMPLETED" ? "Completed" : `${pct}% complete`}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {schoolCourses.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-300">From your school</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {schoolCourses.map((c) => (
              <Link
                key={c.id}
                href={`/educom/${c.id}`}
                className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:border-slate-600"
              >
                {c.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {newAndRecommended.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-300">New courses</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {newAndRecommended.map((c) => (
              <Link
                key={c.id}
                href={`/educom/${c.id}`}
                className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:border-slate-600"
              >
                <p>{c.title}</p>
                {c.school && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.school.name}
                    {c.school.state && ` — ${c.school.state}`}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
