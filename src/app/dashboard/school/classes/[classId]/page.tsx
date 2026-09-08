import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import {
  assignStudentToClass,
  assignTeacherToClass,
  assignCourseToClass,
  unassignCourseFromClass,
} from "@/app/dashboard/school/actions";

export default async function ClassDetailPage({
  params,
}: PageProps<"/dashboard/school/classes/[classId]">) {
  const { classId } = await params;
  const session = await auth();
  if (!session) redirect("/login");
  const now = new Date();

  const school = await prisma.school.findFirst({
    where: { admins: { some: { id: session.user.id } } },
  });
  if (!school) redirect("/dashboard");

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      teachers: { include: { user: { select: { name: true, email: true } } } },
      students: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!cls || cls.schoolId !== school.id) notFound();

  const [unassignedStudents, schoolTeachers, studentUserIds, assignedCourses, schoolCourses] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { schoolId: school.id, classId: null },
      include: { user: { select: { name: true } } },
    }),
    prisma.teacherProfile.findMany({
      where: { schoolId: school.id },
      include: { user: { select: { name: true } } },
    }),
    Promise.resolve(cls.students.map((s) => s.user.id)),
    prisma.classCourseAssignment.findMany({
      where: { classId },
      include: { course: { select: { id: true, title: true } } },
    }),
    prisma.course.findMany({
      where: { schoolId: school.id },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const assignedCourseIds = new Set(assignedCourses.map((a) => a.courseId));
  const unassignedCourses = schoolCourses.filter((c) => !assignedCourseIds.has(c.id));

  const attempts = await prisma.examAttempt.findMany({
    where: { userId: { in: studentUserIds }, submittedAt: { not: null } },
    select: { userId: true, score: true },
  });
  const avgScoreByUser = new Map<string, number>();
  for (const userId of studentUserIds) {
    const scores = attempts.filter((a) => a.userId === userId && a.score !== null).map((a) => a.score!);
    if (scores.length > 0) {
      avgScoreByUser.set(userId, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
    }
  }

  return (
    <div>
      <Link href="/dashboard/school" className="text-sm text-text-secondary hover:text-text-primary">
        ← School dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{cls.name}</h1>
      <p className="mt-1 text-sm text-text-secondary">{cls.students.length} students</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Teachers assigned">
          {cls.teachers.length === 0 ? (
            <p className="text-sm text-text-secondary">No teachers assigned yet.</p>
          ) : (
            <ul className="space-y-1 text-sm text-text-secondary">
              {cls.teachers.map((t) => (
                <li key={t.id}>{t.user.name}</li>
              ))}
            </ul>
          )}
          {schoolTeachers.length > 0 && (
            <form action={assignTeacherToClass} className="mt-3 flex gap-2">
              <input type="hidden" name="classId" value={cls.id} />
              <select
                name="teacherProfileId"
                required
                className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              >
                <option value="">Select a teacher…</option>
                {schoolTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Assign
              </button>
            </form>
          )}
        </Card>

        <Card title="Add a student to this class">
          {unassignedStudents.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No unassigned students in your school right now.
            </p>
          ) : (
            <form action={assignStudentToClass} className="flex gap-2">
              <input type="hidden" name="classId" value={cls.id} />
              <select
                name="studentProfileId"
                required
                className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              >
                <option value="">Select a student…</option>
                {unassignedStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.user.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Add
              </button>
            </form>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Assigned courses">
          <p className="text-xs text-text-muted">
            Assigning a course enrolls every current student in this class; students added later
            are enrolled automatically too.
          </p>
          {assignedCourses.length === 0 ? (
            <p className="mt-2 text-sm text-text-secondary">No courses assigned to this class yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {assignedCourses.map((a) => {
                const isOverdue = a.dueAt && a.dueAt.getTime() < now.getTime();
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <div>
                      <Link
                        href={`/dashboard/teacher/courses/${a.course.id}`}
                        className="text-text-primary hover:text-brand-text"
                      >
                        {a.course.title}
                      </Link>
                      {a.dueAt && (
                        <p className={`text-xs ${isOverdue ? "text-danger" : "text-text-muted"}`}>
                          {isOverdue ? "Overdue — was due" : "Due"} {a.dueAt.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <form action={unassignCourseFromClass}>
                      <input type="hidden" name="classId" value={cls.id} />
                      <input type="hidden" name="courseId" value={a.course.id} />
                      <button type="submit" className="text-xs text-text-secondary hover:text-danger">
                        Unassign
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          {unassignedCourses.length > 0 && (
            <form action={assignCourseToClass} className="mt-3 flex gap-2">
              <input type="hidden" name="classId" value={cls.id} />
              <select
                name="courseId"
                required
                className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              >
                <option value="">Select a course…</option>
                {unassignedCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <input
                type="date"
                name="dueAt"
                title="Due date (optional)"
                className="shrink-0 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Assign
              </button>
            </form>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Roster">
          {cls.students.length === 0 ? (
            <p className="text-sm text-text-secondary">No students in this class yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Avg CBT score</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {cls.students.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-2">{s.user.name}</td>
                    <td className="py-2 text-text-secondary">
                      {avgScoreByUser.has(s.user.id) ? `${avgScoreByUser.get(s.user.id)}%` : "—"}
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/dashboard/school/students/${s.id}`}
                        className="text-brand-text hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
