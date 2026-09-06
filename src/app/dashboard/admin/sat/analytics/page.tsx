import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { DATE_RANGE_LABELS, parseDateRange, rangeSince, type DateRangeKey } from "@/lib/admin/date-range";
import { SAT_CONFIG } from "@/lib/sat/config";
import { SAT_SECTION_LABELS } from "@/lib/sat/types";
import type { SatAttemptKind, SatSection } from "@prisma/client";

const RANGE_KEYS: DateRangeKey[] = ["today", "week", "month", "quarter", "year", "all"];

const KIND_LABELS: Record<SatAttemptKind, string> = {
  DIAGNOSTIC: "Diagnostic",
  SKILL_PRACTICE: "Skill Practice",
  MOCK_EXAM: "Mock Exam",
};

/** Aggregate rollups over existing SatAttempt/SatAttemptItem rows only —
 * same "no new event-log infrastructure, no fabricated numbers" stance
 * TOEFL analytics already took. Kept entirely separate from WAEC/UTME's
 * analytics calculations (own models, own queries) per the spec. */
export default async function SatAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPagePermission("analytics.view");

  const { range: rangeParam } = await searchParams;
  const range = parseDateRange(rangeParam);
  const since = rangeSince(range);
  const startedAtFilter = since ? { startedAt: { gte: since } } : {};

  const [totalAttempts, submittedAttempts, attemptsByKind, skillPracticeBySection, avgScores, items] =
    await Promise.all([
      prisma.satAttempt.count({ where: startedAtFilter }),
      prisma.satAttempt.count({ where: { ...startedAtFilter, submittedAt: { not: null } } }),
      prisma.satAttempt.groupBy({ by: ["kind"], where: startedAtFilter, _count: true }),
      prisma.satAttempt.groupBy({
        by: ["section"],
        where: { ...startedAtFilter, kind: "SKILL_PRACTICE" },
        _count: true,
      }),
      prisma.satAttempt.aggregate({
        where: { ...startedAtFilter, submittedAt: { not: null } },
        _avg: { overallScore: true, readingWritingScore: true, mathScore: true },
      }),
      prisma.satAttemptItem.findMany({
        where: { attempt: startedAtFilter },
        select: {
          contentId: true,
          isCorrect: true,
          timeSpentSecs: true,
          content: { select: { section: true, domain: true, difficulty: true, prompt: true } },
        },
      }),
    ]);

  const answered = items.filter((i) => i.isCorrect !== null);
  const unanswered = items.length - answered.length;

  const domainStats = new Map<string, { section: SatSection; domain: string; correct: number; total: number }>();
  const difficultyStats = new Map<string, { correct: number; total: number }>();
  const contentStats = new Map<string, { total: number; incorrect: number; prompt: string; section: SatSection; domain: string }>();

  for (const item of answered) {
    const domainKey = `${item.content.section}::${item.content.domain}`;
    const d = domainStats.get(domainKey) ?? { section: item.content.section, domain: item.content.domain, correct: 0, total: 0 };
    d.total += 1;
    if (item.isCorrect) d.correct += 1;
    domainStats.set(domainKey, d);

    const diff = difficultyStats.get(item.content.difficulty) ?? { correct: 0, total: 0 };
    diff.total += 1;
    if (item.isCorrect) diff.correct += 1;
    difficultyStats.set(item.content.difficulty, diff);

    const c = contentStats.get(item.contentId) ?? {
      total: 0,
      incorrect: 0,
      prompt: item.content.prompt,
      section: item.content.section,
      domain: item.content.domain,
    };
    c.total += 1;
    if (!item.isCorrect) c.incorrect += 1;
    contentStats.set(item.contentId, c);
  }

  const domainRows = [...domainStats.values()].sort((a, b) => a.correct / a.total - b.correct / b.total);

  const hardestQuestions = [...contentStats.entries()]
    .map(([contentId, c]) => ({ contentId, ...c, missRate: c.incorrect / c.total }))
    .filter((c) => c.total >= 3)
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, 10);

  const timedItems = items.filter((i) => i.timeSpentSecs !== null);
  const avgTimeSec =
    timedItems.length > 0 ? timedItems.reduce((s, i) => s + (i.timeSpentSecs ?? 0), 0) / timedItems.length : null;

  const completionRate = totalAttempts > 0 ? (submittedAttempts / totalAttempts) * 100 : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">SAT Analytics</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Real aggregate rollups over SAT attempts — nothing here is estimated or fabricated.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface-raised p-1 text-xs">
          {RANGE_KEYS.map((key) => (
            <Link
              key={key}
              href={`/dashboard/admin/sat/analytics?range=${key}`}
              className={`rounded-md px-3 py-1.5 ${
                range === key ? "bg-brand text-brand-foreground" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {DATE_RANGE_LABELS[key]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Total attempts">
          <p className="text-3xl font-semibold">{totalAttempts}</p>
          <p className="mt-1 text-xs text-text-muted">{DATE_RANGE_LABELS[range]}</p>
        </Card>
        <Card title="Completion rate">
          <p className="text-3xl font-semibold">{Math.round(completionRate)}%</p>
          <p className="mt-1 text-xs text-text-muted">{submittedAttempts} of {totalAttempts} submitted</p>
        </Card>
        <Card title="Average composite score">
          <p className="text-3xl font-semibold">
            {avgScores._avg.overallScore !== null ? Math.round(avgScores._avg.overallScore) : "—"}
            <span className="text-sm font-normal text-text-muted"> / {SAT_CONFIG.scoreScale.compositeMax}</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">Diagnostic &amp; Mock Exam attempts only</p>
        </Card>
        <Card title="Attempts by type">
          <ul className="space-y-1 text-sm">
            {attemptsByKind.map((r) => (
              <li key={r.kind} className="flex justify-between text-text-secondary">
                <span>{KIND_LABELS[r.kind]}</span>
                <span className="text-text-muted">{r._count}</span>
              </li>
            ))}
            {attemptsByKind.length === 0 && <li className="text-text-muted">No attempts yet.</li>}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Average scores by section">
          <ul className="space-y-1.5 text-sm">
            <li className="flex justify-between text-text-secondary">
              <span>{SAT_SECTION_LABELS.READING_WRITING}</span>
              <span className="text-text-muted">
                {avgScores._avg.readingWritingScore !== null
                  ? `${Math.round(avgScores._avg.readingWritingScore)} / ${SAT_CONFIG.scoreScale.sectionMax}`
                  : "—"}
              </span>
            </li>
            <li className="flex justify-between text-text-secondary">
              <span>{SAT_SECTION_LABELS.MATH}</span>
              <span className="text-text-muted">
                {avgScores._avg.mathScore !== null
                  ? `${Math.round(avgScores._avg.mathScore)} / ${SAT_CONFIG.scoreScale.sectionMax}`
                  : "—"}
              </span>
            </li>
          </ul>
        </Card>

        <Card title="Skill Practice — which section students choose">
          {skillPracticeBySection.length === 0 ? (
            <p className="text-sm text-text-muted">No Skill Practice attempts yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {skillPracticeBySection
                .filter((r): r is typeof r & { section: SatSection } => r.section !== null)
                .sort((a, b) => b._count - a._count)
                .map((r) => (
                  <li key={r.section} className="flex justify-between text-text-secondary">
                    <span>{SAT_SECTION_LABELS[r.section]}</span>
                    <span className="text-text-muted">{r._count} attempts</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Accuracy by domain">
          {domainRows.length === 0 ? (
            <p className="text-sm text-text-muted">No answered questions yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {domainRows.map((d) => (
                <li key={`${d.section}::${d.domain}`} className="flex justify-between gap-4 text-text-secondary">
                  <span className="truncate">
                    {SAT_SECTION_LABELS[d.section]} · {d.domain}
                  </span>
                  <span className="shrink-0 text-text-muted">
                    {Math.round((d.correct / d.total) * 100)}% · {d.total} answered
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Accuracy by difficulty">
          {difficultyStats.size === 0 ? (
            <p className="text-sm text-text-muted">No answered questions yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {(["EASY", "MEDIUM", "HARD"] as const).map((diff) => {
                const s = difficultyStats.get(diff);
                return (
                  <li key={diff} className="flex justify-between text-text-secondary">
                    <span>{diff}</span>
                    <span className="text-text-muted">
                      {s ? `${Math.round((s.correct / s.total) * 100)}% · ${s.total} answered` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Hardest questions (≥3 attempts)">
          {hardestQuestions.length === 0 ? (
            <p className="text-sm text-text-muted">Not enough answered questions yet to rank difficulty.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {hardestQuestions.map((c) => (
                <li key={c.contentId} className="flex justify-between gap-4 text-text-secondary">
                  <span className="truncate">
                    {SAT_SECTION_LABELS[c.section]} · {c.domain} · {c.prompt}
                  </span>
                  <span className="shrink-0 text-text-muted">
                    {Math.round(c.missRate * 100)}% missed · {c.total} attempts
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Unanswered items &amp; time spent">
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{unanswered}</span> of {items.length} items in
            attempts started or created were never answered.
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Average time per item:{" "}
            {avgTimeSec !== null ? (
              `${Math.round(avgTimeSec)}s`
            ) : (
              <span className="text-text-muted">not tracked yet</span>
            )}
          </p>
        </Card>
      </div>
    </div>
  );
}
