import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { BulkUploadForm } from "@/components/school/bulk-upload-form";
import {
  updateSchoolProfile,
  addTeacherByEmail,
  addStudentByEmail,
  createClass,
  assignSponsoredSeat,
} from "@/app/dashboard/school/actions";
import { PLAN_LABELS } from "@/lib/plans";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";

export default async function SchoolDashboard() {
  const session = await auth();
  if (!session) return null;

  const school = await prisma.school.findFirst({
    where: { admins: { some: { id: session.user.id } } },
    include: { classes: { orderBy: { name: "asc" } } },
  });
  if (!school) redirect("/dashboard");

  const students = await prisma.studentProfile.findMany({
    where: { schoolId: school.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      class: { select: { id: true, name: true } },
    },
  });
  const studentUserIds = students.map((s) => s.user.id);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [teacherCount, activeAttemptUsers, activeLessonUsers, attempts, enrollments] =
    await Promise.all([
      prisma.teacherProfile.count({ where: { schoolId: school.id } }),
      prisma.examAttempt.findMany({
        where: { userId: { in: studentUserIds }, submittedAt: { gte: thirtyDaysAgo } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.lessonProgress.findMany({
        where: {
          enrollment: { userId: { in: studentUserIds } },
          completedAt: { gte: thirtyDaysAgo },
        },
        select: { enrollment: { select: { userId: true } } },
        distinct: ["enrollmentId"],
      }),
      prisma.examAttempt.findMany({
        where: { userId: { in: studentUserIds }, submittedAt: { not: null } },
        select: { userId: true, score: true },
      }),
      prisma.courseEnrollment.findMany({
        where: { userId: { in: studentUserIds } },
        include: {
          course: { select: { modules: { select: { lessons: { select: { id: true } } } } } },
          lessonProgress: { where: { completedAt: { not: null } }, select: { lessonId: true } },
        },
      }),
    ]);

  const activeStudentIds = new Set([
    ...activeAttemptUsers.map((a) => a.userId),
    ...activeLessonUsers.map((l) => l.enrollment.userId),
  ]);

  const avgCbtScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.score ?? 0), 0) / attempts.length)
      : null;

  const completionRates = enrollments.map((e) => {
    const total = e.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    return total > 0 ? e.lessonProgress.length / total : 0;
  });
  const avgCourseCompletion =
    completionRates.length > 0
      ? Math.round(
          (completionRates.reduce((sum, r) => sum + r, 0) / completionRates.length) * 100
        )
      : null;

  const scoresByUser = new Map<string, number[]>();
  for (const a of attempts) {
    if (a.score === null) continue;
    const list = scoresByUser.get(a.userId) ?? [];
    list.push(a.score);
    scoresByUser.set(a.userId, list);
  }
  const studentAverages = students
    .map((s) => {
      const scores = scoresByUser.get(s.user.id);
      const avg = scores && scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return { student: s, avg };
    })
    .filter((s): s is { student: (typeof students)[number]; avg: number } => s.avg !== null);

  const needsAttention = studentAverages.filter((s) => s.avg < 40).sort((a, b) => a.avg - b.avg).slice(0, 5);
  const topPerformers = [...studentAverages].sort((a, b) => b.avg - a.avg).slice(0, 5);

  const sponsorshipPrograms = await prisma.sponsorshipProgram.findMany({
    where: { schoolId: school.id },
    include: {
      sponsor: { select: { organization: true, user: { select: { name: true } } } },
      vouchers: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{school.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Enroll students, monitor cohort performance, and manage your
            school&apos;s SmartPrepAfrica access.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/educom/schools/${school.id}`}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
          >
            View public profile
          </Link>
          <a
            href="/api/school/roster.csv"
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
          >
            Export roster CSV
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Enrolled students">
          <p className="text-3xl font-semibold">{students.length}</p>
        </Card>
        <Card title="Active students (30d)">
          <p className="text-3xl font-semibold">{activeStudentIds.size}</p>
        </Card>
        <Card title="Teachers">
          <p className="text-3xl font-semibold">{teacherCount}</p>
        </Card>
        <Card title="Classes">
          <p className="text-3xl font-semibold">{school.classes.length}</p>
        </Card>
        <Card title="Average CBT score">
          <p className="text-3xl font-semibold">{avgCbtScore !== null ? `${avgCbtScore}%` : "—"}</p>
        </Card>
        <Card title="Average course completion">
          <p className="text-3xl font-semibold">
            {avgCourseCompletion !== null ? `${avgCourseCompletion}%` : "—"}
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Students requiring attention (avg score < 40%)">
          {needsAttention.length === 0 ? (
            <p className="text-sm text-slate-400">None right now.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {needsAttention.map(({ student, avg }) => (
                <li key={student.id} className="flex justify-between">
                  <Link
                    href={`/dashboard/school/students/${student.id}`}
                    className="text-slate-200 hover:text-orange-400"
                  >
                    {student.user.name}
                  </Link>
                  <span className="text-red-400">{Math.round(avg)}%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Top-performing students">
          {topPerformers.length === 0 ? (
            <p className="text-sm text-slate-400">No scored attempts yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {topPerformers.map(({ student, avg }) => (
                <li key={student.id} className="flex justify-between">
                  <Link
                    href={`/dashboard/school/students/${student.id}`}
                    className="text-slate-200 hover:text-orange-400"
                  >
                    {student.user.name}
                  </Link>
                  <span className="text-green-400">{Math.round(avg)}%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="School profile">
          <form action={updateSchoolProfile} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={school.name}
                required
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400" htmlFor="address">
                Address
              </label>
              <input
                id="address"
                name="address"
                defaultValue={school.address ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400" htmlFor="logoUrl">
                Logo URL
              </label>
              <input
                id="logoUrl"
                name="logoUrl"
                defaultValue={school.logoUrl ?? ""}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400" htmlFor="coverImageUrl">
                Cover image URL
              </label>
              <input
                id="coverImageUrl"
                name="coverImageUrl"
                defaultValue={school.coverImageUrl ?? ""}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400" htmlFor="state">
                State
              </label>
              <select
                id="state"
                name="state"
                defaultValue={school.state ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              >
                <option value="">Select a state…</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400" htmlFor="description">
                Public description
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={school.description ?? ""}
                rows={3}
                placeholder="What makes your school worth learning from, wherever a student is based?"
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

        <Card title="Classes">
          {school.classes.length === 0 ? (
            <p className="text-sm text-slate-400">No classes yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {school.classes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/school/classes/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm hover:border-slate-600"
                  >
                    <span>{c.name}</span>
                    <span className="text-orange-400">View →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <form action={createClass} className="mt-3 flex gap-2">
            <input
              type="text"
              name="className"
              required
              placeholder="New class name (e.g. SS2 Gold)"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Create
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Add a teacher">
          <p className="text-xs text-slate-500">
            The teacher must already have a SmartPrepAfrica Teacher account.
          </p>
          <form action={addTeacherByEmail} className="mt-2 flex gap-2">
            <input
              type="email"
              name="teacherEmail"
              required
              placeholder="teacher@example.com"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Add
            </button>
          </form>
        </Card>

        <Card title="Add a student">
          <p className="text-xs text-slate-500">
            The student must already have a SmartPrepAfrica Student account.
          </p>
          <form action={addStudentByEmail} className="mt-2 flex gap-2">
            <input
              type="email"
              name="studentEmail"
              required
              placeholder="student@example.com"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Add
            </button>
          </form>
        </Card>
      </div>

      {sponsorshipPrograms.length > 0 && (
        <div className="mt-6">
          <Card title="Sponsored licenses">
            <div className="space-y-3">
              {sponsorshipPrograms.map((p) => {
                const available = p.vouchers.filter((v) => v.status === "ACTIVE").length;
                const redeemed = p.vouchers.filter((v) => v.status === "REDEEMED").length;
                return (
                  <div key={p.id} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-100">{p.name}</p>
                        <p className="text-xs text-slate-500">
                          Sponsored by {p.sponsor.organization ?? p.sponsor.user.name} ·{" "}
                          {PLAN_LABELS[p.plan]}
                        </p>
                      </div>
                      <p className="text-sm text-slate-300">
                        {redeemed} used · {available} available
                      </p>
                    </div>
                    {available > 0 && (
                      <form action={assignSponsoredSeat} className="mt-3 flex gap-2">
                        <input type="hidden" name="programId" value={p.id} />
                        <select
                          name="studentProfileId"
                          required
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                        >
                          <option value="">Select a student…</option>
                          {students.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.user.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
                        >
                          Assign seat
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card title="Bulk-upload students (CSV)">
          <BulkUploadForm classes={school.classes} />
        </Card>
      </div>
    </div>
  );
}
