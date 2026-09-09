import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { NotificationsCard } from "@/components/dashboard/notifications-card";
import { BulkUploadForm } from "@/components/school/bulk-upload-form";
import { BulkAssignLicensesForm } from "@/components/school/bulk-assign-licenses-form";
import { InviteForm } from "@/components/school/invite-form";
import {
  updateSchoolProfile,
  inviteTeacher,
  inviteStudent,
  revokeSchoolInvitation,
  createClass,
  assignSponsoredSeat,
} from "@/app/dashboard/school/actions";
import { purchaseSchoolLicenses, assignSchoolLicenseSeat } from "@/app/dashboard/school/license-actions";
import { PLAN_LABELS, formatMoney, resolvePlanPrice } from "@/lib/plans";
import { getNigerianStates } from "@/lib/nigerian-states";
import { averageScore, MIN_BENCHMARK_SAMPLE_SIZE } from "@/lib/school-performance";

export default async function SchoolDashboard() {
  const session = await auth();
  if (!session) return null;

  const school = await prisma.school.findFirst({
    where: { admins: { some: { id: session.user.id } } },
    include: { classes: { orderBy: { name: "asc" } } },
  });
  if (!school) redirect("/dashboard");

  const NIGERIAN_STATES = await getNigerianStates();

  const pendingInvitations = await prisma.schoolInvitation.findMany({
    where: { schoolId: school.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

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

  const [teacherCount, activeAttemptUsers, activeLessonUsers, attempts, enrollments, stateAttempts, nationalAttempts] =
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
      // Benchmark comparisons — scoped to school-affiliated students only,
      // on both sides, so the comparison is cohort-to-cohort rather than
      // diluted by individual sign-ups with no school at all.
      school.state
        ? prisma.examAttempt.findMany({
            where: {
              submittedAt: { not: null },
              user: { studentProfile: { school: { state: school.state } } },
            },
            select: { score: true },
          })
        : Promise.resolve([]),
      prisma.examAttempt.findMany({
        where: {
          submittedAt: { not: null },
          user: { studentProfile: { schoolId: { not: null } } },
        },
        select: { score: true },
      }),
    ]);

  const activeStudentIds = new Set([
    ...activeAttemptUsers.map((a) => a.userId),
    ...activeLessonUsers.map((l) => l.enrollment.userId),
  ]);

  const avgCbtScore = averageScore(attempts);
  const stateAvgScore =
    school.state && stateAttempts.length >= MIN_BENCHMARK_SAMPLE_SIZE
      ? averageScore(stateAttempts)
      : null;
  const nationalAvgScore =
    nationalAttempts.length >= MIN_BENCHMARK_SAMPLE_SIZE ? averageScore(nationalAttempts) : null;

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

  const licensePurchases = await prisma.schoolLicensePurchase.findMany({
    where: { schoolId: school.id, status: "SUCCESS" },
    include: { vouchers: { select: { status: true } } },
    orderBy: { createdAt: "desc" },
  });
  const availableLicenseSeats = licensePurchases.reduce(
    (sum, p) => sum + p.vouchers.filter((v) => v.status === "ACTIVE").length,
    0
  );
  const redeemedLicenseSeats = licensePurchases.reduce(
    (sum, p) => sum + p.vouchers.filter((v) => v.status === "REDEEMED").length,
    0
  );
  const perSeatPrice = await resolvePlanPrice("SCHOOL");

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{school.name}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Enroll students, monitor cohort performance, and manage your
            school&apos;s SmartPrepAfrica access.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/educom/schools/${school.id}`}
            className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted"
          >
            View public profile
          </Link>
          <a
            href="/api/school/roster.csv"
            className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted"
          >
            Export roster CSV
          </a>
          <a
            href="/api/school/performance.csv"
            className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted"
          >
            Export performance CSV
          </a>
        </div>
      </div>

      <NotificationsCard notifications={notifications} path="/dashboard/school" />

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

      <div className="mt-6">
        <Card title="Performance benchmark (average CBT score)">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-text-muted">This school</p>
              <p className="text-2xl font-semibold">{avgCbtScore !== null ? `${avgCbtScore}%` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">{school.state ?? "State"} average</p>
              <p className="text-2xl font-semibold">
                {stateAvgScore !== null ? `${stateAvgScore}%` : "Not enough data yet"}
              </p>
              {avgCbtScore !== null && stateAvgScore !== null && (
                <p className={`text-xs ${avgCbtScore >= stateAvgScore ? "text-success" : "text-danger"}`}>
                  {avgCbtScore >= stateAvgScore ? "+" : ""}
                  {avgCbtScore - stateAvgScore} pts vs. state
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-text-muted">National average</p>
              <p className="text-2xl font-semibold">
                {nationalAvgScore !== null ? `${nationalAvgScore}%` : "Not enough data yet"}
              </p>
              {avgCbtScore !== null && nationalAvgScore !== null && (
                <p className={`text-xs ${avgCbtScore >= nationalAvgScore ? "text-success" : "text-danger"}`}>
                  {avgCbtScore >= nationalAvgScore ? "+" : ""}
                  {avgCbtScore - nationalAvgScore} pts vs. national
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Students requiring attention (avg score < 40%)">
          {needsAttention.length === 0 ? (
            <p className="text-sm text-text-secondary">None right now.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {needsAttention.map(({ student, avg }) => (
                <li key={student.id} className="flex justify-between">
                  <Link
                    href={`/dashboard/school/students/${student.id}`}
                    className="text-text-primary hover:text-brand-text"
                  >
                    {student.user.name}
                  </Link>
                  <span className="text-danger">{Math.round(avg)}%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Top-performing students">
          {topPerformers.length === 0 ? (
            <p className="text-sm text-text-secondary">No scored attempts yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {topPerformers.map(({ student, avg }) => (
                <li key={student.id} className="flex justify-between">
                  <Link
                    href={`/dashboard/school/students/${student.id}`}
                    className="text-text-primary hover:text-brand-text"
                  >
                    {student.user.name}
                  </Link>
                  <span className="text-success">{Math.round(avg)}%</span>
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
              <label className="block text-xs text-text-secondary" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={school.name}
                required
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary" htmlFor="address">
                Address
              </label>
              <input
                id="address"
                name="address"
                defaultValue={school.address ?? ""}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary" htmlFor="logoUrl">
                Logo URL
              </label>
              <input
                id="logoUrl"
                name="logoUrl"
                defaultValue={school.logoUrl ?? ""}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary" htmlFor="coverImageUrl">
                Cover image URL
              </label>
              <input
                id="coverImageUrl"
                name="coverImageUrl"
                defaultValue={school.coverImageUrl ?? ""}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary" htmlFor="state">
                State
              </label>
              <select
                id="state"
                name="state"
                defaultValue={school.state ?? ""}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
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
              <label className="block text-xs text-text-secondary" htmlFor="description">
                Public description
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={school.description ?? ""}
                rows={3}
                placeholder="What makes your school worth learning from, wherever a student is based?"
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Save
            </button>
          </form>
        </Card>

        <Card title="Classes">
          {school.classes.length === 0 ? (
            <p className="text-sm text-text-secondary">No classes yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {school.classes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/school/classes/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:border-border-strong"
                  >
                    <span>{c.name}</span>
                    <span className="text-brand-text">View →</span>
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
              className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Create
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Invite a teacher">
          <p className="text-xs text-text-muted">
            They&apos;ll need to accept before joining your school.
          </p>
          <div className="mt-2">
            <InviteForm
              emailField="teacherEmail"
              emailPlaceholder="teacher@example.com"
              action={inviteTeacher}
            />
          </div>
        </Card>

        <Card title="Invite a student">
          <p className="text-xs text-text-muted">
            They&apos;ll need to accept before joining your school.
          </p>
          <div className="mt-2">
            <InviteForm
              emailField="studentEmail"
              emailPlaceholder="student@example.com"
              action={inviteStudent}
              classes={school.classes}
            />
          </div>
        </Card>
      </div>

      {pendingInvitations.length > 0 && (
        <div className="mt-6">
          <Card title="Pending invitations">
            <ul className="space-y-2">
              {pendingInvitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
                >
                  <span>
                    <span className="text-text-primary">{inv.inviteeEmail}</span>
                    <span className="ml-2 text-xs text-text-muted">
                      {inv.role === "TEACHER" ? "Teacher" : "Student"} invite
                    </span>
                  </span>
                  <form action={revokeSchoolInvitation}>
                    <input type="hidden" name="invitationId" value={inv.id} />
                    <button
                      type="submit"
                      className="text-xs text-text-secondary hover:text-danger"
                    >
                      Revoke
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card title="Buy student licenses">
          <p className="text-sm text-text-secondary">
            {perSeatPrice ? formatMoney(perSeatPrice.amountMinor, perSeatPrice.currency) : "—"} per
            seat / month. {availableLicenseSeats} available · {redeemedLicenseSeats} assigned.
          </p>
          <form action={purchaseSchoolLicenses} className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-text-secondary" htmlFor="seatCount">
                Seats
              </label>
              <input
                id="seatCount"
                name="seatCount"
                type="number"
                min={1}
                defaultValue={10}
                required
                className="mt-1 w-24 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary" htmlFor="durationDays">
                Duration (days)
              </label>
              <input
                id="durationDays"
                name="durationDays"
                type="number"
                min={1}
                defaultValue={365}
                required
                className="mt-1 w-28 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Buy licenses
            </button>
          </form>

          {availableLicenseSeats > 0 && (
            <form action={assignSchoolLicenseSeat} className="mt-4 flex gap-2 border-t border-border pt-4">
              <select
                name="studentProfileId"
                required
                className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              >
                <option value="">Assign a seat to…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.user.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Assign seat
              </button>
            </form>
          )}
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
                  <div key={p.id} className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-primary">{p.name}</p>
                        <p className="text-xs text-text-muted">
                          Sponsored by {p.sponsor.organization ?? p.sponsor.user.name} ·{" "}
                          {PLAN_LABELS[p.plan]}
                        </p>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {redeemed} used · {available} available
                      </p>
                    </div>
                    {available > 0 && (
                      <form action={assignSponsoredSeat} className="mt-3 flex gap-2">
                        <input type="hidden" name="programId" value={p.id} />
                        <select
                          name="studentProfileId"
                          required
                          className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
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
                          className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Bulk-upload students (CSV)">
          <BulkUploadForm classes={school.classes} />
        </Card>
        {availableLicenseSeats > 0 && (
          <Card title="Bulk-license new students (CSV)">
            <p className="text-xs text-text-muted">
              Creates a new account for each row and licenses it immediately —
              {" "}{availableLicenseSeats} seat{availableLicenseSeats === 1 ? "" : "s"} available.
            </p>
            <div className="mt-3">
              <BulkAssignLicensesForm classes={school.classes} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
