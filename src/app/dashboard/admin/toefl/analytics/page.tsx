import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { DATE_RANGE_LABELS, parseDateRange, rangeSince, type DateRangeKey } from "@/lib/admin/date-range";
import { TOEFL_SKILL_LABELS } from "@/lib/toefl/types";
import type { ToeflAttemptKind, ToeflSkill } from "@prisma/client";

const RANGE_KEYS: DateRangeKey[] = ["today", "week", "month", "quarter", "year", "all"];

const KIND_LABELS: Record<ToeflAttemptKind, string> = {
  DIAGNOSTIC: "Diagnostic",
  SKILL_PRACTICE: "Skill Practice",
  MOCK_EXAM: "Mock Exam",
};

const SCORE_FIELD_LABELS: { key: "overallScore" | "readingScore" | "listeningScore" | "speakingScore" | "writingScore"; label: string }[] = [
  { key: "overallScore", label: "Overall (Diagnostic/Mock only)" },
  { key: "readingScore", label: "Reading" },
  { key: "listeningScore", label: "Listening" },
  { key: "speakingScore", label: "Speaking" },
  { key: "writingScore", label: "Writing" },
];

/** Aggregate rollups over existing ToeflAttempt/ToeflAttemptItem rows
 * only — same "no new event-log infrastructure" stance Learning
 * analytics already took. Never fabricates a number: Writing/Speaking
 * have no automated evaluator yet, so their "average score" is
 * deliberately not shown here — see the evaluation-status card instead. */
export default async function ToeflAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPagePermission("analytics.view");

  const { range: rangeParam } = await searchParams;
  const range = parseDateRange(rangeParam);
  const since = rangeSince(range);
  const startedAtFilter = since ? { startedAt: { gte: since } } : {};

  const [
    totalAttempts,
    submittedAttempts,
    attemptsByKind,
    skillPracticeBySkill,
    avgScores,
    itemTotalsByContent,
    itemIncorrectByContent,
    freeformEvalCounts,
  ] = await Promise.all([
    prisma.toeflAttempt.count({ where: startedAtFilter }),
    prisma.toeflAttempt.count({ where: { ...startedAtFilter, submittedAt: { not: null } } }),
    prisma.toeflAttempt.groupBy({ by: ["kind"], where: startedAtFilter, _count: true }),
    prisma.toeflAttempt.groupBy({
      by: ["skill"],
      where: { ...startedAtFilter, kind: "SKILL_PRACTICE" },
      _count: true,
    }),
    prisma.toeflAttempt.aggregate({
      where: { ...startedAtFilter, submittedAt: { not: null } },
      _avg: { overallScore: true, readingScore: true, listeningScore: true, speakingScore: true, writingScore: true },
    }),
    prisma.toeflAttemptItem.groupBy({
      by: ["contentId"],
      where: { isCorrect: { not: null }, attempt: startedAtFilter },
      _count: true,
    }),
    prisma.toeflAttemptItem.groupBy({
      by: ["contentId"],
      where: { isCorrect: false, attempt: startedAtFilter },
      _count: true,
    }),
    prisma.toeflAttemptItem.groupBy({
      by: ["evalStatus"],
      where: { content: { skill: { in: ["WRITING", "SPEAKING"] } }, attempt: startedAtFilter },
      _count: true,
    }),
  ]);

  const incorrectByContentId = new Map(itemIncorrectByContent.map((r) => [r.contentId, r._count]));
  const hardestCandidates = itemTotalsByContent
    .map((r) => {
      const incorrect = incorrectByContentId.get(r.contentId) ?? 0;
      return { contentId: r.contentId, total: r._count, incorrect, missRate: incorrect / r._count };
    })
    .filter((r) => r.total >= 3)
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, 10);

  const contentById = new Map(
    (
      await prisma.toeflContent.findMany({
        where: { id: { in: hardestCandidates.map((c) => c.contentId) } },
        select: { id: true, skill: true, prompt: true },
      })
    ).map((c) => [c.id, c])
  );

  const completionRate = totalAttempts > 0 ? (submittedAttempts / totalAttempts) * 100 : 0;
  const unavailableCount = freeformEvalCounts.find((r) => r.evalStatus === "UNAVAILABLE")?._count ?? 0;
  const totalFreeformResponses = freeformEvalCounts.reduce((sum, r) => sum + r._count, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h2 font-semibold text-text-primary">TOEFL Analytics</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Real aggregate rollups over TOEFL attempts — nothing here is estimated or fabricated.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface-raised p-1 text-xs">
          {RANGE_KEYS.map((key) => (
            <Link
              key={key}
              href={`/dashboard/admin/toefl/analytics?range=${key}`}
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
        <Card title="Average overall score">
          <p className="text-3xl font-semibold">
            {avgScores._avg.overallScore !== null ? avgScores._avg.overallScore.toFixed(1) : "—"}
            <span className="text-sm font-normal text-text-muted"> / 6</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">Diagnostic &amp; Mock Exam attempts only</p>
        </Card>
        <Card title="Attempts by kind">
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
        <Card title="Average scores by skill">
          <ul className="space-y-1.5 text-sm">
            {SCORE_FIELD_LABELS.map(({ key, label }) => {
              const value = avgScores._avg[key];
              return (
                <li key={key} className="flex justify-between text-text-secondary">
                  <span>{label}</span>
                  <span className="text-text-muted">{value !== null ? `${value.toFixed(1)} / 6` : "—"}</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Skill Practice — which skill students choose">
          {skillPracticeBySkill.length === 0 ? (
            <p className="text-sm text-text-muted">No Skill Practice attempts yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {skillPracticeBySkill
                .filter((r): r is typeof r & { skill: ToeflSkill } => r.skill !== null)
                .sort((a, b) => b._count - a._count)
                .map((r) => (
                  <li key={r.skill} className="flex justify-between text-text-secondary">
                    <span>{TOEFL_SKILL_LABELS[r.skill]}</span>
                    <span className="text-text-muted">{r._count} attempts</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Hardest questions (Reading &amp; Listening, ≥3 attempts)">
          {hardestCandidates.length === 0 ? (
            <p className="text-sm text-text-muted">Not enough answered questions yet to rank difficulty.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {hardestCandidates.map((c) => {
                const content = contentById.get(c.contentId);
                return (
                  <li key={c.contentId} className="flex justify-between gap-4 text-text-secondary">
                    <span className="truncate">
                      {content ? `${TOEFL_SKILL_LABELS[content.skill]} · ${content.prompt}` : c.contentId}
                    </span>
                    <span className="shrink-0 text-text-muted">
                      {Math.round(c.missRate * 100)}% missed · {c.total} attempts
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Writing &amp; Speaking evaluation status">
          <p className="text-sm text-text-secondary">
            {totalFreeformResponses} Writing/Speaking responses collected in this range.
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{unavailableCount}</span> are marked
            &quot;AI evaluation not currently available&quot; — no automated Writing/Speaking evaluator exists yet
            (planned for a later step). No score is fabricated for these responses anywhere in this app.
          </p>
        </Card>
      </div>
    </div>
  );
}
