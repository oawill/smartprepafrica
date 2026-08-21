import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPage } from "@/lib/admin/authz";
import { DATE_RANGE_LABELS, parseDateRange, rangeSince, type DateRangeKey } from "@/lib/admin/date-range";

function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(
    kobo / 100
  );
}

const RANGE_KEYS: DateRangeKey[] = ["today", "week", "month", "quarter", "year", "all"];

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPage();

  const { range: rangeParam } = await searchParams;
  const range = parseDateRange(rangeParam);
  const since = rangeSince(range);
  const createdAtFilter = since ? { createdAt: { gte: since } } : {};
  const startedAtFilter = since ? { startedAt: { gte: since } } : {};

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalStudents,
    totalTeachers,
    totalParents,
    totalSchoolAdmins,
    totalPartners,
    totalSponsors,
    totalQuestions,
    totalCourses,
    totalLessons,
    practiceSessions,
    mockExams,
    examAttempts,
    schoolsRegistered,
    schoolsActive,
    schoolsPending,
    schoolsCourseProvider,
    paidSubscribers,
    subscriptionRevenue,
    partnerCommissions,
    pendingPayouts,
    aiCoachUsers,
    aiRequestsToday,
    aiRequestsThisMonth,
    aiCostTotals,
    topAiSubjects,
    openSupportRequests,
    pendingPartnerApprovals,
    pendingSchoolApprovals,
    pendingCourseApprovals,
    flaggedAccounts,
    failedLoginsInRange,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "PARENT" } }),
    prisma.user.count({ where: { role: "SCHOOL_ADMIN" } }),
    prisma.user.count({ where: { role: "PARTNER" } }),
    prisma.user.count({ where: { role: "SPONSOR" } }),
    prisma.question.count(),
    prisma.course.count(),
    prisma.lesson.count(),
    prisma.examAttempt.count({ where: { mode: { in: ["STUDY_DRILL", "CBT_PRACTICE"] }, ...startedAtFilter } }),
    prisma.examAttempt.count({ where: { mode: "MOCK_EXAM", ...startedAtFilter } }),
    prisma.examAttempt.count({ where: startedAtFilter }),
    prisma.school.count(),
    prisma.school.count({ where: { status: "ACTIVE" } }),
    prisma.school.count({ where: { status: "PENDING" } }),
    prisma.school.count({ where: { courses: { some: {} } } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({
      _sum: { amountKobo: true },
      where: { status: "SUCCESS", kind: "CHARGE", ...createdAtFilter },
    }),
    prisma.partnerCommission.aggregate({
      _sum: { amountKobo: true },
      where: createdAtFilter,
    }),
    prisma.partnerPayout.aggregate({
      _sum: { amountKobo: true },
      where: { status: { in: ["REQUESTED", "APPROVED"] } },
    }),
    prisma.aiUsageLog.findMany({
      where: { feature: "coach_chat", createdAt: { gte: startOfMonth } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.aiUsageLog.count({ where: { feature: "coach_chat", createdAt: { gte: startOfDay } } }),
    prisma.aiUsageLog.count({ where: { feature: "coach_chat", createdAt: { gte: startOfMonth } } }),
    prisma.aiUsageLog.aggregate({
      where: { feature: "coach_chat" },
      _sum: { estimatedCostKobo: true },
    }),
    prisma.aiConversation.groupBy({
      by: ["subjectId"],
      where: { subjectId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { subjectId: "desc" } },
      take: 3,
    }),
    prisma.contactSubmission.count({ where: { status: { in: ["NEW", "IN_REVIEW"] } } }),
    prisma.partner.count({ where: { status: "PENDING" } }),
    prisma.school.count({ where: { status: { in: ["PENDING", "VERIFICATION_REQUIRED"] } } }),
    prisma.course.count({ where: { moderationStatus: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.user.count({ where: { status: { in: ["SUSPENDED", "LOCKED"] } } }),
    prisma.loginActivity.count({ where: { success: false, ...createdAtFilter } }),
  ]);

  const topSubjectIds = topAiSubjects.map((s) => s.subjectId).filter((id): id is string => !!id);
  const subjects = await prisma.subject.findMany({ where: { id: { in: topSubjectIds } } });
  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Platform health</h1>
          <p className="mt-1 text-sm text-slate-400">
            Central control center for SmartPrepAfrica.com.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
          {RANGE_KEYS.map((key) => (
            <Link
              key={key}
              href={`/dashboard/admin?range=${key}`}
              className={`rounded-md px-3 py-1.5 ${
                range === key ? "bg-orange-500 text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              {DATE_RANGE_LABELS[key]}
            </Link>
          ))}
        </div>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Users</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Total students">
          <p className="text-3xl font-semibold">{totalStudents}</p>
        </Card>
        <Card title="Teachers">
          <p className="text-3xl font-semibold">{totalTeachers}</p>
        </Card>
        <Card title="Parents">
          <p className="text-3xl font-semibold">{totalParents}</p>
        </Card>
        <Card title="School admins">
          <p className="text-3xl font-semibold">{totalSchoolAdmins}</p>
        </Card>
        <Card title="Partners">
          <p className="text-3xl font-semibold">{totalPartners}</p>
        </Card>
        <Card title="Sponsors">
          <p className="text-3xl font-semibold">{totalSponsors}</p>
        </Card>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Education</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Total questions">
          <p className="text-3xl font-semibold">{totalQuestions}</p>
        </Card>
        <Card title="Courses">
          <p className="text-3xl font-semibold">{totalCourses}</p>
        </Card>
        <Card title="Lessons">
          <p className="text-3xl font-semibold">{totalLessons}</p>
        </Card>
        <Card title="Practice sessions">
          <p className="text-3xl font-semibold">{practiceSessions}</p>
        </Card>
        <Card title="Mock exams">
          <p className="text-3xl font-semibold">{mockExams}</p>
        </Card>
        <Card title="Exam attempts">
          <p className="text-3xl font-semibold">{examAttempts}</p>
        </Card>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Schools</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Registered">
          <p className="text-3xl font-semibold">{schoolsRegistered}</p>
        </Card>
        <Card title="Active">
          <p className="text-3xl font-semibold">{schoolsActive}</p>
        </Card>
        <Card title="Pending">
          <p className="text-3xl font-semibold">{schoolsPending}</p>
        </Card>
        <Card title="Course providers">
          <p className="text-3xl font-semibold">{schoolsCourseProvider}</p>
        </Card>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Paid subscribers">
          <p className="text-3xl font-semibold">{paidSubscribers}</p>
        </Card>
        <Card title="Subscription revenue">
          <p className="text-3xl font-semibold">{formatNaira(subscriptionRevenue._sum.amountKobo ?? 0)}</p>
        </Card>
        <Card title="Partner commissions">
          <p className="text-3xl font-semibold">{formatNaira(partnerCommissions._sum.amountKobo ?? 0)}</p>
        </Card>
        <Card title="Pending payouts">
          <p className="text-3xl font-semibold">{formatNaira(pendingPayouts._sum.amountKobo ?? 0)}</p>
        </Card>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">AI</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Coach users (30d)">
          <p className="text-3xl font-semibold">{aiCoachUsers.length}</p>
        </Card>
        <Card title="Requests today">
          <p className="text-3xl font-semibold">{aiRequestsToday}</p>
        </Card>
        <Card title="Requests this month">
          <p className="text-3xl font-semibold">{aiRequestsThisMonth}</p>
        </Card>
        <Card title="Estimated cost (all-time)">
          <p className="text-3xl font-semibold">{formatNaira(aiCostTotals._sum.estimatedCostKobo ?? 0)}</p>
        </Card>
        <Card title="Most-asked subjects">
          {topSubjectIds.length === 0 ? (
            <p className="text-sm text-slate-500">No AI Coach conversations yet.</p>
          ) : (
            <ul className="text-sm text-slate-300">
              {topAiSubjects.map((s) => (
                <li key={s.subjectId}>
                  {subjectNameById.get(s.subjectId!) ?? "Unknown"} — {s._count._all}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Platform</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Open support requests">
          <p className="text-3xl font-semibold">{openSupportRequests}</p>
        </Card>
        <Card title="Pending approvals">
          <p className="text-3xl font-semibold">
            {pendingPartnerApprovals + pendingSchoolApprovals + pendingCourseApprovals}
          </p>
          <p className="text-xs text-slate-500">
            {pendingPartnerApprovals} partners · {pendingSchoolApprovals} schools · {pendingCourseApprovals} courses
          </p>
        </Card>
        <Card title="Flagged accounts">
          <p className="text-3xl font-semibold">{flaggedAccounts}</p>
        </Card>
        <Card title="Failed logins (range)">
          <p className="text-3xl font-semibold">{failedLoginsInRange}</p>
          <p className="text-xs text-slate-500">Basic heuristic — flagged for manual review, not auto-blocked.</p>
        </Card>
      </div>
    </div>
  );
}
