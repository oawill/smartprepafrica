import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPage } from "@/lib/admin/authz";
import { DATE_RANGE_LABELS, parseDateRange, rangeSince, type DateRangeKey } from "@/lib/admin/date-range";
import { formatNaira } from "@/lib/plans";

const RANGE_KEYS: DateRangeKey[] = ["today", "week", "month", "quarter", "year", "all"];

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; country?: string }>;
}) {
  await requireAdminPage();

  const { range: rangeParam, country: countryParam } = await searchParams;
  const range = parseDateRange(rangeParam);
  const since = rangeSince(range);
  const createdAtFilter = since ? { createdAt: { gte: since } } : {};
  const startedAtFilter = since ? { startedAt: { gte: since } } : {};

  const countries = await prisma.country.findMany({ orderBy: { name: "asc" } });
  const selectedCountry = countries.find((c) => c.code === countryParam);
  const countryId = selectedCountry?.id;
  // Applied only where a country dimension is meaningful and cleanly
  // reachable — user-scoped counts, schools, subscription revenue, and
  // exam-attempt activity. AI usage and platform-security metrics stay
  // unfiltered (not part of the brief's requested filter list).
  const userCountryFilter = countryId ? { countryId } : {};
  const relatedUserCountryFilter = countryId ? { user: { countryId } } : {};
  const schoolCountryFilter = countryId ? { countryId } : {};
  const questionCountryFilter = countryId ? { countryExam: { countryId } } : {};

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
    newRegistrations,
    activeUserLogins,
    linkedParentStudentAccounts,
    activeTeachers,
    publishedCourses,
    schoolEnrollments,
    activeSponsorships,
    partnerConversions,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", ...userCountryFilter } }),
    prisma.user.count({ where: { role: "TEACHER", ...userCountryFilter } }),
    prisma.user.count({ where: { role: "PARENT", ...userCountryFilter } }),
    prisma.user.count({ where: { role: "SCHOOL_ADMIN", ...userCountryFilter } }),
    prisma.user.count({ where: { role: "PARTNER", ...userCountryFilter } }),
    prisma.user.count({ where: { role: "SPONSOR", ...userCountryFilter } }),
    prisma.question.count({ where: questionCountryFilter }),
    prisma.course.count(),
    prisma.lesson.count(),
    prisma.examAttempt.count({
      where: { mode: { in: ["STUDY_DRILL", "CBT_PRACTICE"] }, ...startedAtFilter, ...relatedUserCountryFilter },
    }),
    prisma.examAttempt.count({ where: { mode: "MOCK_EXAM", ...startedAtFilter, ...relatedUserCountryFilter } }),
    prisma.examAttempt.count({ where: { ...startedAtFilter, ...relatedUserCountryFilter } }),
    prisma.school.count({ where: schoolCountryFilter }),
    prisma.school.count({ where: { status: "ACTIVE", ...schoolCountryFilter } }),
    prisma.school.count({ where: { status: "PENDING", ...schoolCountryFilter } }),
    prisma.school.count({ where: { courses: { some: {} }, ...schoolCountryFilter } }),
    prisma.subscription.count({ where: { status: "ACTIVE", ...relatedUserCountryFilter } }),
    prisma.payment.aggregate({
      _sum: { amountKobo: true },
      where: { status: "SUCCESS", kind: "CHARGE", ...createdAtFilter, ...relatedUserCountryFilter },
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
    prisma.loginActivity.count({ where: { success: false, ...createdAtFilter, ...relatedUserCountryFilter } }),
    prisma.user.count({ where: { ...createdAtFilter, ...userCountryFilter } }),
    prisma.loginActivity.findMany({
      where: { success: true, ...createdAtFilter, ...relatedUserCountryFilter },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.parentStudentLink.count({ where: { status: "ACTIVE" } }),
    prisma.teacherProfile.count({
      where: { OR: [{ courses: { some: { published: true } } }, { classes: { some: {} } }] },
    }),
    prisma.course.count({ where: { published: true } }),
    prisma.studentProfile.count({ where: { schoolId: { not: null } } }),
    prisma.voucherRedemption.count(),
    prisma.partnerReferral.count({ where: { status: "REGISTERED", ...createdAtFilter } }),
  ]);

  const topSubjectIds = topAiSubjects.map((s) => s.subjectId).filter((id): id is string => !!id);
  const subjects = await prisma.subject.findMany({ where: { id: { in: topSubjectIds } } });
  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">Platform health</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Central control center for SmartPrepAfrica.com.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 rounded-lg border border-border bg-surface-raised p-1 text-xs">
            {RANGE_KEYS.map((key) => (
              <Link
                key={key}
                href={`/dashboard/admin?range=${key}${countryParam ? `&country=${countryParam}` : ""}`}
                className={`rounded-md px-3 py-1.5 ${
                  range === key ? "bg-brand text-brand-foreground" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {DATE_RANGE_LABELS[key]}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface-raised p-1 text-xs">
            <Link
              href={`/dashboard/admin?range=${range}`}
              className={`rounded-md px-3 py-1.5 ${
                !selectedCountry ? "bg-brand text-brand-foreground" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              All countries
            </Link>
            {countries.map((c) => (
              <Link
                key={c.code}
                href={`/dashboard/admin?range=${range}&country=${c.code}`}
                className={`rounded-md px-3 py-1.5 ${
                  selectedCountry?.code === c.code
                    ? "bg-brand text-brand-foreground"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {c.flag} {c.code}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Users{selectedCountry ? ` (${selectedCountry.name})` : ""}
      </h2>
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

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Ecosystem activity ({DATE_RANGE_LABELS[range]})
      </h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="New registrations">
          <p className="text-3xl font-semibold">{newRegistrations}</p>
        </Card>
        <Card title="Active users">
          <p className="text-3xl font-semibold">{activeUserLogins.length}</p>
          <p className="text-xs text-text-muted">Distinct successful logins in range.</p>
        </Card>
        <Card title="Linked parent/student accounts">
          <p className="text-3xl font-semibold">{linkedParentStudentAccounts}</p>
        </Card>
        <Card title="Active teachers">
          <p className="text-3xl font-semibold">{activeTeachers}</p>
          <p className="text-xs text-text-muted">Have a published course or an assigned class.</p>
        </Card>
        <Card title="Published courses">
          <p className="text-3xl font-semibold">{publishedCourses}</p>
        </Card>
        <Card title="School enrollments">
          <p className="text-3xl font-semibold">{schoolEnrollments}</p>
          <p className="text-xs text-text-muted">Students affiliated with a school.</p>
        </Card>
        <Card title="Active sponsorships">
          <p className="text-3xl font-semibold">{activeSponsorships}</p>
          <p className="text-xs text-text-muted">Vouchers redeemed to a real beneficiary.</p>
        </Card>
        <Card title="Partner conversions">
          <p className="text-3xl font-semibold">{partnerConversions}</p>
          <p className="text-xs text-text-muted">Referral clicks that led to a registration.</p>
        </Card>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-muted">Education</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title={selectedCountry ? `Total questions (${selectedCountry.code})` : "Total questions"}>
          <p className="text-3xl font-semibold">{totalQuestions}</p>
        </Card>
        <Card title="Courses (all countries)">
          <p className="text-3xl font-semibold">{totalCourses}</p>
        </Card>
        <Card title="Lessons (all countries)">
          <p className="text-3xl font-semibold">{totalLessons}</p>
        </Card>
        <Card title={selectedCountry ? `Practice sessions (${selectedCountry.code})` : "Practice sessions"}>
          <p className="text-3xl font-semibold">{practiceSessions}</p>
        </Card>
        <Card title={selectedCountry ? `Mock exams (${selectedCountry.code})` : "Mock exams"}>
          <p className="text-3xl font-semibold">{mockExams}</p>
        </Card>
        <Card title={selectedCountry ? `Exam attempts (${selectedCountry.code})` : "Exam attempts"}>
          <p className="text-3xl font-semibold">{examAttempts}</p>
        </Card>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Schools{selectedCountry ? ` (${selectedCountry.name})` : ""}
      </h2>
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

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-muted">Revenue</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title={selectedCountry ? `Paid subscribers (${selectedCountry.code})` : "Paid subscribers"}>
          <p className="text-3xl font-semibold">{paidSubscribers}</p>
        </Card>
        <Card title={selectedCountry ? `Subscription revenue (${selectedCountry.code})` : "Subscription revenue"}>
          <p className="text-3xl font-semibold">{formatNaira(subscriptionRevenue._sum.amountKobo ?? 0)}</p>
        </Card>
        <Card title="Partner commissions (all countries)">
          <p className="text-3xl font-semibold">{formatNaira(partnerCommissions._sum.amountKobo ?? 0)}</p>
        </Card>
        <Card title="Pending payouts (all countries)">
          <p className="text-3xl font-semibold">{formatNaira(pendingPayouts._sum.amountKobo ?? 0)}</p>
        </Card>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-muted">AI</h2>
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
            <p className="text-sm text-text-muted">No AI Coach conversations yet.</p>
          ) : (
            <ul className="text-sm text-text-secondary">
              {topAiSubjects.map((s) => (
                <li key={s.subjectId}>
                  {subjectNameById.get(s.subjectId!) ?? "Unknown"} — {s._count._all}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-muted">Platform</h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Open support requests">
          <p className="text-3xl font-semibold">{openSupportRequests}</p>
        </Card>
        <Card title="Pending approvals">
          <p className="text-3xl font-semibold">
            {pendingPartnerApprovals + pendingSchoolApprovals + pendingCourseApprovals}
          </p>
          <p className="text-xs text-text-muted">
            {pendingPartnerApprovals} partners · {pendingSchoolApprovals} schools · {pendingCourseApprovals} courses
          </p>
        </Card>
        <Card title="Flagged accounts">
          <p className="text-3xl font-semibold">{flaggedAccounts}</p>
        </Card>
        <Card title="Failed logins (range)">
          <p className="text-3xl font-semibold">{failedLoginsInRange}</p>
          <p className="text-xs text-text-muted">Basic heuristic — flagged for manual review, not auto-blocked.</p>
        </Card>
      </div>
    </div>
  );
}
