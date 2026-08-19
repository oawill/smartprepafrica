import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { updateTeacherProfile } from "@/app/dashboard/teacher/actions";

export default async function TeacherDashboard() {
  const session = await auth();
  if (!session) return null;

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      school: { select: { name: true } },
      classes: {
        orderBy: { name: "asc" },
        include: { students: { select: { id: true, user: { select: { id: true } } } } },
      },
      courses: { select: { id: true, title: true, published: true } },
    },
  });
  if (!teacher) redirect("/dashboard");

  const classCount = teacher?.classes.length ?? 0;
  const courseCount = teacher?.courses.length ?? 0;
  const allStudentUserIds = (teacher?.classes ?? []).flatMap((c) =>
    c.students.map((s) => s.user.id)
  );

  const attempts = allStudentUserIds.length
    ? await prisma.examAttempt.findMany({
        where: { userId: { in: allStudentUserIds }, submittedAt: { not: null } },
        select: { userId: true, score: true },
      })
    : [];

  const avgByUser = new Map<string, number>();
  for (const userId of allStudentUserIds) {
    const scores = attempts.filter((a) => a.userId === userId && a.score !== null).map((a) => a.score!);
    if (scores.length > 0) {
      avgByUser.set(userId, scores.reduce((a, b) => a + b, 0) / scores.length);
    }
  }
  const fallingBehindCount = [...avgByUser.values()].filter((avg) => avg < 40).length;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Teacher dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            {teacher?.school?.name
              ? `Teaching at ${teacher.school.name}.`
              : "Not yet assigned to a school — ask your school administrator to add you."}
          </p>
        </div>
        {teacher && (
          <Link
            href={`/educom/teachers/${teacher.id}`}
            className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
          >
            View public profile
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Classes">
          <p className="text-3xl font-semibold">{classCount}</p>
        </Card>
        <Card title="Courses">
          <p className="text-3xl font-semibold">{courseCount}</p>
        </Card>
        <Card title="Students falling behind (avg < 40%)">
          <p className="text-3xl font-semibold">{fallingBehindCount}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="My classes">
          {!teacher || teacher.classes.length === 0 ? (
            <p className="text-sm text-slate-400">
              No classes assigned yet. Your school administrator can assign
              you to a class.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {teacher.classes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/teacher/classes/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm hover:border-slate-600"
                  >
                    <span>{c.name}</span>
                    <span className="text-xs text-slate-500">
                      {c.students.length} student{c.students.length === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="My courses">
          {!teacher || teacher.courses.length === 0 ? (
            <p className="text-sm text-slate-400">No courses created yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {teacher.courses.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/teacher/courses/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm hover:border-slate-600"
                  >
                    <span>{c.title}</span>
                    <span
                      className={`text-xs ${c.published ? "text-green-400" : "text-amber-400"}`}
                    >
                      {c.published ? "Published" : "Draft"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/dashboard/teacher/courses/new"
            className="mt-3 inline-block rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
          >
            Create a course
          </Link>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Public profile">
          <p className="text-xs text-slate-500">
            Shown on your Educom teacher profile so students anywhere can
            find and learn from you.
          </p>
          <form action={updateTeacherProfile} className="mt-3 space-y-3">
            <div>
              <label className="block text-xs text-slate-400" htmlFor="bio">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                defaultValue={teacher?.bio ?? ""}
                rows={3}
                placeholder="What should students know about how you teach?"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400" htmlFor="qualifications">
                  Qualifications
                </label>
                <input
                  id="qualifications"
                  name="qualifications"
                  defaultValue={teacher?.qualifications ?? ""}
                  placeholder="B.Sc. Mathematics, PGDE"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400" htmlFor="yearsExperience">
                  Years of experience
                </label>
                <input
                  id="yearsExperience"
                  name="yearsExperience"
                  type="number"
                  min={0}
                  defaultValue={teacher?.yearsExperience ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400" htmlFor="photoUrl">
                Photo URL
              </label>
              <input
                id="photoUrl"
                name="photoUrl"
                defaultValue={teacher?.photoUrl ?? ""}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Save
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
