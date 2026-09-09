import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { getStudentInsights } from "@/lib/student-insights";
import { getExamReadiness } from "@/lib/ai/mastery-service";
import { checkoutForChild } from "@/app/dashboard/parent/actions";
import { PLAN_LABELS, resolvePlanPrice, formatMoney } from "@/lib/plans";

const purchasablePlans = ["BASIC", "PREMIUM"] as const;

const alertStyles: Record<string, string> = {
  warning: "border-warning/40 bg-warning-surface text-warning",
  info: "border-border-strong bg-surface-sunken text-text-secondary",
  success: "border-success/40 bg-success-surface text-success",
};

export default async function ChildDetailPage({
  params,
  searchParams,
}: PageProps<"/dashboard/parent/children/[studentId]">) {
  const { studentId } = await params;
  const { status } = await searchParams;
  const session = await auth();
  if (!session) redirect("/login");

  const link = await prisma.parentStudentLink.findUnique({
    where: {
      parentId_studentId: { parentId: session.user.id, studentId },
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          school: { select: { name: true } },
          class: { select: { name: true } },
        },
      },
    },
  });

  if (!link || link.status !== "ACTIVE") notFound();

  const { student } = link;
  const insights = await getStudentInsights(student.user.id);
  const readiness = await getExamReadiness(student.user.id);

  const payer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { countryId: true },
  });
  const prices = Object.fromEntries(
    await Promise.all(
      purchasablePlans.map(async (plan) => [plan, await resolvePlanPrice(plan, payer?.countryId)] as const)
    )
  ) as Record<(typeof purchasablePlans)[number], { amountMinor: number; currency: string } | null>;

  const recommendedCourses = insights.weakSubjects.length
    ? await prisma.course.findMany({
        where: {
          published: true,
          subject: { name: { in: insights.weakSubjects } },
        },
        include: {
          subject: { select: { name: true } },
          school: { select: { name: true, state: true } },
          reviews: { select: { rating: true } },
        },
        take: 20,
      })
    : [];
  const rankedRecommendations = recommendedCourses
    .map((c) => ({
      course: c,
      avgRating: c.reviews.length
        ? c.reviews.reduce((sum, r) => sum + r.rating, 0) / c.reviews.length
        : null,
    }))
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    .slice(0, 4);

  return (
    <div>
      <Link href="/dashboard/parent" className="text-sm text-text-secondary hover:text-text-primary">
        ← All children
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">{student.user.name}</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {student.school?.name ?? "No school linked"}
        {student.class ? ` · ${student.class.name}` : ""}
        {student.targetExams.length > 0
          ? ` · Preparing for ${student.targetExams.join(", ")}`
          : ""}
      </p>

      {status === "error" && (
        <p className="mt-4 rounded-lg border border-danger/40 bg-danger-surface px-4 py-2 text-sm text-danger">
          Something went wrong starting checkout. Please try again.
        </p>
      )}

      {insights.alerts.length > 0 && (
        <div className="mt-4 space-y-2">
          {insights.alerts.map((alert, i) => (
            <p
              key={i}
              className={`rounded-lg border px-4 py-2 text-sm ${alertStyles[alert.severity]}`}
            >
              {alert.message}
            </p>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Avg exam score">
          <p className="text-3xl font-semibold">
            {insights.examSummary.avgScore !== null
              ? `${insights.examSummary.avgScore}%`
              : "—"}
          </p>
        </Card>
        <Card title="Exam attempts">
          <p className="text-3xl font-semibold">{insights.examSummary.totalAttempts}</p>
        </Card>
        <Card title="This week">
          <p className="text-3xl font-semibold">
            {insights.studyActivity.attemptsThisWeek} attempts
          </p>
          <p className="text-xs text-text-muted">
            {insights.studyActivity.lessonsCompletedThisWeek} lessons ·{" "}
            {insights.studyActivity.questionsAnsweredThisWeek} questions
          </p>
        </Card>
        <Card title="Courses enrolled">
          <p className="text-3xl font-semibold">{insights.courseProgress.length}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Recent exam attempts">
          {insights.examSummary.recent.length === 0 ? (
            <p className="text-sm text-text-secondary">No exam attempts yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {insights.examSummary.recent.map((a, i) => (
                <li key={i} className="flex justify-between text-text-secondary">
                  <span>
                    {a.exam} · {a.mode.toLowerCase().replace("_", " ")}
                  </span>
                  <span className="text-text-muted">
                    {a.score !== null ? `${Math.round(a.score)}%` : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Weak topics">
          {insights.weakTopics.length === 0 ? (
            <p className="text-sm text-text-secondary">No weak topics identified yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {insights.weakTopics.map(({ topic, missed }) => (
                <li key={topic} className="flex justify-between text-text-secondary">
                  <span>{topic}</span>
                  <span className="text-text-muted">{missed} missed</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {readiness.length > 0 && (
        <div className="mt-6">
          <Card title="AI Coach: Mastery & Study Insights">
            <p className="text-xs text-text-muted">
              A high-level summary from {student.user.name.split(" ")[0]}&apos;s AI Study Coach
              activity. Private conversations aren&apos;t shown here — only overall progress.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {readiness.map((r) => (
                <div key={r.subjectName} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">{r.subjectName}</span>
                    <span className="text-sm font-semibold text-brand-text">{r.readinessPct}%</span>
                  </div>
                  {r.strongTopics.length > 0 && (
                    <p className="mt-1 text-xs text-success">Strong: {r.strongTopics.join(", ")}</p>
                  )}
                  {r.weakTopics.length > 0 && (
                    <p className="mt-1 text-xs text-warning">
                      Recommended focus: {r.weakTopics.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-text-muted">
              Estimated from practice history — not a guarantee of exam results.
            </p>
          </Card>
        </div>
      )}

      {rankedRecommendations.length > 0 && (
        <div className="mt-6">
          <Card title={`Recommended for ${insights.weakSubjects.join(", ")}`}>
            <p className="text-xs text-text-muted">
              {student.user.name.split(" ")[0]} is struggling with{" "}
              {insights.weakSubjects.join(", ")}. Here are courses from
              schools across Nigeria that might help.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {rankedRecommendations.map(({ course, avgRating }) => (
                <Link
                  key={course.id}
                  href={`/learn/${course.id}`}
                  className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm hover:border-border-strong"
                >
                  <p className="text-text-primary">{course.title}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {course.school?.name}
                    {course.school?.state && ` — ${course.school.state}`}
                    {avgRating !== null && ` · ${avgRating.toFixed(1)} ★`}
                  </p>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card title="Course progress">
          {insights.courseProgress.length === 0 ? (
            <p className="text-sm text-text-secondary">Not enrolled in any courses yet.</p>
          ) : (
            <div className="space-y-3">
              {insights.courseProgress.map((c) => (
                <div key={c.courseId}>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-primary">{c.title}</span>
                    <span className="text-text-muted">
                      {c.completedLessons}/{c.totalLessons} lessons
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="h-full bg-success"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Purchase a subscription for this child">
          <div className="grid gap-3 sm:grid-cols-2">
            {purchasablePlans.map((plan) => (
              <form key={plan} action={checkoutForChild}>
                <input type="hidden" name="studentProfileId" value={studentId} />
                <input type="hidden" name="plan" value={plan} />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-border-strong px-4 py-3 text-left text-sm hover:border-brand"
                >
                  <span className="font-medium text-text-primary">
                    {PLAN_LABELS[plan]}
                  </span>
                  <span className="block text-xs text-text-muted">
                    {prices[plan] ? `${formatMoney(prices[plan]!.amountMinor, prices[plan]!.currency)} / month` : "Contact us"}
                  </span>
                </button>
              </form>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
