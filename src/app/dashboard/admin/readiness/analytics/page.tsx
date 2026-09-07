import Link from "next/link";
import type { ExamType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { DATE_RANGE_LABELS, parseDateRange, rangeSince, type DateRangeKey } from "@/lib/admin/date-range";
import { examLabels } from "@/lib/exam-slugs";

const RANGE_KEYS: DateRangeKey[] = ["today", "week", "month", "quarter", "year", "all"];
const ALL_EXAMS: ExamType[] = ["WAEC", "NECO", "UTME", "POST_UTME"];
const MIN_ATTEMPTS_FOR_DIFFICULTY = 3;

/** Aggregate, anonymous rollups over existing ExamAttempt/QuestionResponse/
 * StudentExamTopicMastery rows only — no per-student data shown, matching
 * the existing SAT analytics page's own convention. */
export default async function ReadinessAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPagePermission("readiness.view");

  const { range: rangeParam } = await searchParams;
  const range = parseDateRange(rangeParam);
  const since = rangeSince(range);
  const startedAtFilter = since ? { startedAt: { gte: since } } : {};

  const [attemptsByExam, drillAttempts, submittedDrillAttempts, avgDrillScore, readinessByExam, responses] =
    await Promise.all([
      prisma.examAttempt.groupBy({ by: ["exam"], where: startedAtFilter, _count: true }),
      prisma.examAttempt.count({ where: { ...startedAtFilter, mode: "STUDY_DRILL" } }),
      prisma.examAttempt.count({ where: { ...startedAtFilter, mode: "STUDY_DRILL", submittedAt: { not: null } } }),
      prisma.examAttempt.aggregate({
        where: { ...startedAtFilter, mode: "STUDY_DRILL", submittedAt: { not: null } },
        _avg: { score: true },
      }),
      prisma.studentExamTopicMastery.groupBy({
        by: ["exam"],
        where: { confidenceScore: { gt: 0.15 } },
        _avg: { masteryScore: true },
      }),
      prisma.questionResponse.findMany({
        where: { isCorrect: { not: null }, attempt: startedAtFilter },
        select: {
          isCorrect: true,
          question: { select: { topic: true, subject: { select: { name: true } } } },
        },
      }),
    ]);

  const attemptCountByExam = new Map(attemptsByExam.map((a) => [a.exam, a._count]));
  const avgReadinessByExam = new Map(readinessByExam.map((r) => [r.exam, r._avg.masteryScore]));

  const subjectStats = new Map<string, { correct: number; total: number }>();
  const topicStats = new Map<string, { subject: string; correct: number; total: number }>();
  for (const r of responses) {
    if (!r.question.topic) continue;
    const subjectName = r.question.subject.name;
    const s = subjectStats.get(subjectName) ?? { correct: 0, total: 0 };
    s.total += 1;
    if (r.isCorrect) s.correct += 1;
    subjectStats.set(subjectName, s);

    const key = `${subjectName}::${r.question.topic}`;
    const t = topicStats.get(key) ?? { subject: subjectName, correct: 0, total: 0 };
    t.total += 1;
    if (r.isCorrect) t.correct += 1;
    topicStats.set(key, t);
  }

  const hardestSubjects = [...subjectStats.entries()]
    .filter(([, s]) => s.total >= MIN_ATTEMPTS_FOR_DIFFICULTY)
    .map(([name, s]) => ({ name, accuracyPct: Math.round((s.correct / s.total) * 100), total: s.total }))
    .sort((a, b) => a.accuracyPct - b.accuracyPct)
    .slice(0, 10);

  const hardestTopics = [...topicStats.entries()]
    .filter(([, t]) => t.total >= MIN_ATTEMPTS_FOR_DIFFICULTY)
    .map(([key, t]) => ({ topic: key.split("::")[1], subject: t.subject, accuracyPct: Math.round((t.correct / t.total) * 100), total: t.total }))
    .sort((a, b) => a.accuracyPct - b.accuracyPct)
    .slice(0, 10);

  const completionRatePct = drillAttempts > 0 ? Math.round((submittedDrillAttempts / drillAttempts) * 100) : null;

  return (
    <div>
      <Link href="/dashboard/admin" className="text-sm text-text-secondary hover:text-text-primary">
        ← Admin dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Readiness &amp; Drills Analytics</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Aggregate, anonymous learning analytics across WAEC, NECO, UTME and Post-UTME. No individual student data is
        shown here.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {RANGE_KEYS.map((key) => (
          <Link
            key={key}
            href={`/dashboard/admin/readiness/analytics?range=${key}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              range === key ? "border-brand bg-brand/10 text-brand-text" : "border-border-strong text-text-secondary"
            }`}
          >
            {DATE_RANGE_LABELS[key]}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Drill attempts">
          <p className="text-3xl font-semibold">{drillAttempts}</p>
        </Card>
        <Card title="Drill completion rate">
          <p className="text-3xl font-semibold">{completionRatePct === null ? "—" : `${completionRatePct}%`}</p>
        </Card>
        <Card title="Average drill score">
          <p className="text-3xl font-semibold">
            {avgDrillScore._avg.score === null ? "—" : `${Math.round(avgDrillScore._avg.score)}%`}
          </p>
        </Card>
        <Card title="Total exam attempts">
          <p className="text-3xl font-semibold">{[...attemptCountByExam.values()].reduce((a, b) => a + b, 0)}</p>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Average readiness by exam">
          <ul className="space-y-1.5 text-sm">
            {ALL_EXAMS.map((exam) => {
              const avg = avgReadinessByExam.get(exam);
              return (
                <li key={exam} className="flex justify-between text-text-secondary">
                  <span>{examLabels[exam]}</span>
                  <span className="text-text-muted">
                    {avg === undefined || avg === null ? "Not enough data" : `${Math.round(avg)}%`} ·{" "}
                    {attemptCountByExam.get(exam) ?? 0} attempts
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Most difficult subjects">
          {hardestSubjects.length === 0 ? (
            <p className="text-sm text-text-secondary">Not enough data yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {hardestSubjects.map((s) => (
                <li key={s.name} className="flex justify-between text-text-secondary">
                  <span>{s.name}</span>
                  <span className="text-text-muted">{s.accuracyPct}% correct ({s.total})</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Most difficult topics">
          {hardestTopics.length === 0 ? (
            <p className="text-sm text-text-secondary">Not enough data yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {hardestTopics.map((t) => (
                <li key={`${t.subject}::${t.topic}`} className="flex justify-between text-text-secondary">
                  <span>
                    {t.topic} <span className="text-text-muted">({t.subject})</span>
                  </span>
                  <span className="text-text-muted">{t.accuracyPct}% correct ({t.total})</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
