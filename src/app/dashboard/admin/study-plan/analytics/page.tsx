import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { DATE_RANGE_LABELS, parseDateRange, rangeSince, type DateRangeKey } from "@/lib/admin/date-range";

const RANGE_KEYS: DateRangeKey[] = ["today", "week", "month", "quarter", "year", "all"];

/** Aggregate, anonymous rollups over StudyPlan/StudyPlanItem only — no
 * per-student data shown, matching the existing Readiness Analytics page's
 * own convention (brief §23: never expose one student's data to another). */
export default async function StudyPlanAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPagePermission("study_plan.view");

  const { range: rangeParam } = await searchParams;
  const range = parseDateRange(rangeParam);
  const since = rangeSince(range);
  const generatedFilter = since ? { generatedAt: { gte: since } } : {};

  const [activePlans, totalPlans, items, mockAttempts] = await Promise.all([
    prisma.studyPlan.count({ where: { status: "ACTIVE", ...generatedFilter } }),
    prisma.studyPlan.count({ where: generatedFilter }),
    prisma.studyPlanItem.findMany({
      where: { studyPlan: generatedFilter },
      select: { status: true, recommendedMinutes: true, subject: { select: { name: true } }, topic: true },
    }),
    prisma.examAttempt.count({ where: { mode: "MOCK_EXAM", ...(since ? { startedAt: { gte: since } } : {}) } }),
  ]);

  const completedCount = items.filter((i) => i.status === "COMPLETED").length;
  const completionRatePct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : null;

  const avgPlannedMinutes =
    totalPlans > 0 ? Math.round(items.reduce((sum, i) => sum + i.recommendedMinutes, 0) / totalPlans) : 0;

  const subjectCounts = new Map<string, number>();
  const weakTopicCounts = new Map<string, { subject: string; count: number }>();
  for (const item of items) {
    subjectCounts.set(item.subject.name, (subjectCounts.get(item.subject.name) ?? 0) + 1);
    if (item.status === "MISSED" || item.status === "SKIPPED") {
      const key = `${item.subject.name}::${item.topic}`;
      const entry = weakTopicCounts.get(key) ?? { subject: item.subject.name, count: 0 };
      entry.count += 1;
      weakTopicCounts.set(key, entry);
    }
  }

  const mostStudiedSubjects = [...subjectCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const mostCommonWeakTopics = [...weakTopicCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([key, v]) => ({ topic: key.split("::")[1], subject: v.subject, count: v.count }));

  return (
    <div>
      <Link href="/dashboard/admin" className="text-sm text-text-secondary hover:text-text-primary">
        ← Admin dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Study Plan Analytics</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Aggregate, anonymous rollups across every student&apos;s Weekly Study Plan. No individual student data is
        shown here.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {RANGE_KEYS.map((key) => (
          <Link
            key={key}
            href={`/dashboard/admin/study-plan/analytics?range=${key}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              range === key ? "border-brand bg-brand/10 text-brand-text" : "border-border-strong text-text-secondary"
            }`}
          >
            {DATE_RANGE_LABELS[key]}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Students with active plans">
          <p className="text-3xl font-semibold">{activePlans}</p>
        </Card>
        <Card title="Weekly completion rate">
          <p className="text-3xl font-semibold">{completionRatePct === null ? "—" : `${completionRatePct}%`}</p>
        </Card>
        <Card title="Average planned minutes / plan">
          <p className="text-3xl font-semibold">{avgPlannedMinutes}</p>
        </Card>
        <Card title="Mock exams in range">
          <p className="text-3xl font-semibold">{mockAttempts}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Most studied subjects">
          {mostStudiedSubjects.length === 0 ? (
            <p className="text-sm text-text-secondary">Not enough data yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {mostStudiedSubjects.map(([name, count]) => (
                <li key={name} className="flex justify-between text-text-secondary">
                  <span>{name}</span>
                  <span className="text-text-muted">{count} activities</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Most commonly missed/skipped topics">
          {mostCommonWeakTopics.length === 0 ? (
            <p className="text-sm text-text-secondary">Not enough data yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {mostCommonWeakTopics.map((t) => (
                <li key={`${t.subject}::${t.topic}`} className="flex justify-between text-text-secondary">
                  <span>
                    {t.topic} <span className="text-text-muted">({t.subject})</span>
                  </span>
                  <span className="text-text-muted">{t.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
