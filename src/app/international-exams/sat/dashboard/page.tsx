import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { SatSectionScoreCard } from "@/components/sat/sat-section-score-card";
import { SatEmptyState } from "@/components/sat/sat-empty-state";
import { isSatEnabled, SAT_CONFIG } from "@/lib/sat/config";
import { SAT_SECTION_LABELS } from "@/lib/sat/types";
import { getScoreGoal } from "@/lib/sat/score-goal-service";

export const metadata: Metadata = {
  title: "SAT Dashboard",
};

export default async function SatDashboardPage() {
  if (!isSatEnabled()) notFound();

  const session = await auth();
  if (!session) redirect("/login");
  const userId = session.user.id;

  const [attempts, goal] = await Promise.all([
    prisma.satAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      include: { items: { include: { content: true } } },
    }),
    getScoreGoal(userId),
  ]);

  const submitted = attempts.filter((a) => a.submittedAt !== null);
  // Most-recent-first (orderBy startedAt desc). Each section score comes
  // from the most recent attempt that actually set it, same pattern as
  // the TOEFL dashboard — a single-section practice attempt only ever
  // fills in its own score column.
  const overallSource = submitted.find((a) => a.overallScore !== null);
  const readingWritingScore = submitted.find((a) => a.readingWritingScore !== null)?.readingWritingScore ?? null;
  const mathScore = submitted.find((a) => a.mathScore !== null)?.mathScore ?? null;

  // Strongest/Weakest Domain deliberately excludes DRILL attempts: an
  // Adaptive Drill intentionally oversamples the student's own weak
  // domains with harder-for-them content, so folding it in here would
  // create a feedback loop that drags "weakest domain" down further by
  // the very feature meant to remediate it. Other metrics below (Questions
  // Completed, Practice Streak, section accuracy) intentionally DO include
  // drills — more practice should count, and a quick drill is exactly the
  // kind of low-friction habit a streak should reward.
  const nonDrillSubmitted = submitted.filter((a) => a.kind !== "DRILL");
  const domainStats = new Map<string, { correct: number; total: number }>();
  for (const attempt of nonDrillSubmitted) {
    for (const item of attempt.items) {
      if (item.isCorrect === null) continue;
      const stat = domainStats.get(item.content.domain) ?? { correct: 0, total: 0 };
      stat.total += 1;
      if (item.isCorrect) stat.correct += 1;
      domainStats.set(item.content.domain, stat);
    }
  }
  const domainRates = [...domainStats.entries()].map(([domain, s]) => ({ domain, rate: s.correct / s.total }));
  const strongestDomain = domainRates.length
    ? domainRates.reduce((a, b) => (b.rate > a.rate ? b : a)).domain
    : null;
  const weakestDomain = domainRates.length
    ? domainRates.reduce((a, b) => (b.rate < a.rate ? b : a)).domain
    : null;

  const sectionStats: Record<"READING_WRITING" | "MATH", { correct: number; total: number }> = {
    READING_WRITING: { correct: 0, total: 0 },
    MATH: { correct: 0, total: 0 },
  };
  for (const attempt of submitted) {
    for (const item of attempt.items) {
      if (item.isCorrect === null) continue;
      sectionStats[item.content.section].total += 1;
      if (item.isCorrect) sectionStats[item.content.section].correct += 1;
    }
  }
  const readingWritingAccuracy =
    sectionStats.READING_WRITING.total > 0
      ? Math.round((sectionStats.READING_WRITING.correct / sectionStats.READING_WRITING.total) * 100)
      : null;
  const mathAccuracy =
    sectionStats.MATH.total > 0 ? Math.round((sectionStats.MATH.correct / sectionStats.MATH.total) * 100) : null;

  const drillsCompleted = submitted.filter((a) => a.kind === "DRILL").length;
  const questionsCompleted = submitted.reduce((sum, a) => sum + a.items.length, 0);
  const practiceTimeMinutes = Math.round(
    submitted.reduce((sum, a) => sum + a.items.reduce((s, i) => s + (i.timeSpentSecs ?? 0), 0), 0) / 60
  );

  const submissionDates = [...new Set(submitted.map((a) => a.submittedAt!.toISOString().slice(0, 10)))].sort(
    (a, b) => (a < b ? 1 : -1)
  );
  let studyStreakDays = 0;
  if (submissionDates.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const cursor = new Date();
    for (let i = 0; i < submissionDates.length; i++) {
      const expected = cursor.toISOString().slice(0, 10);
      if (submissionDates[i] === expected || (i === 0 && submissionDates[i] === today)) {
        studyStreakDays++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  const hasData = submitted.length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <Link href="/international-exams/sat" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to SAT overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">SAT Readiness</h1>
      <p className="mt-2 text-sm text-text-secondary">
        SmartPrepAfrica Estimated SAT Readiness Score — not an official College Board score.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card title="Estimated Total">
          <div className="text-2xl font-semibold text-text-primary">
            {overallSource?.overallScore ?? "--"}
            <span className="text-sm font-normal text-text-muted"> / {SAT_CONFIG.scoreScale.compositeMax}</span>
          </div>
        </Card>
        <SatSectionScoreCard label={SAT_SECTION_LABELS.READING_WRITING} score={readingWritingScore} />
        <SatSectionScoreCard label={SAT_SECTION_LABELS.MATH} score={mathScore} />
      </div>

      <div className="mt-4">
        <Card title="Target Score">
          {goal ? (
            <p className="text-sm text-text-secondary">
              <span className="text-lg font-semibold text-text-primary">{goal.targetScore}</span> /{" "}
              {SAT_CONFIG.scoreScale.compositeMax}
              {goal.testDate &&
                ` · Test date: ${goal.testDate.toLocaleDateString("en-NG", { timeZone: "UTC" })}`}
            </p>
          ) : (
            <p className="text-sm text-text-secondary">
              No target set yet.{" "}
              <Link href="/international-exams/sat/score-goal" className="text-brand-text hover:underline">
                Set a score goal →
              </Link>
            </p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Link
          href="/international-exams/sat/drill"
          className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Start a Drill →
        </Link>
      </div>

      {!hasData ? (
        <div className="mt-8">
          <SatEmptyState message="Complete Reading and Writing or Math practice to see your SAT readiness." />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Current Study Streak">
            <p className="text-2xl font-semibold text-text-primary">{studyStreakDays}d</p>
          </Card>
          <Card title="Questions Completed">
            <p className="text-2xl font-semibold text-text-primary">{questionsCompleted}</p>
          </Card>
          <Card title="Drills Completed">
            <p className="text-2xl font-semibold text-text-primary">{drillsCompleted}</p>
          </Card>
          <Card title="Practice Time">
            <p className="text-2xl font-semibold text-text-primary">{practiceTimeMinutes}m</p>
          </Card>
          <Card title="Reading & Writing Accuracy">
            <p className="text-2xl font-semibold text-text-primary">
              {readingWritingAccuracy !== null ? `${readingWritingAccuracy}%` : "--"}
            </p>
          </Card>
          <Card title="Math Accuracy">
            <p className="text-2xl font-semibold text-text-primary">{mathAccuracy !== null ? `${mathAccuracy}%` : "--"}</p>
          </Card>
          <Card title="Strongest / Weakest Domain">
            <p className="text-sm text-text-secondary">
              {strongestDomain ?? "--"} / {weakestDomain ?? "--"}
            </p>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <Card title="Recent Activity">
          {submitted.length === 0 ? (
            <SatEmptyState message="No SAT practice activity yet." />
          ) : (
            <ul className="space-y-2 text-sm">
              {submitted.slice(0, 10).map((a) => (
                <li key={a.id} className="flex justify-between border-b border-border pb-1.5 last:border-0">
                  <span className="text-text-secondary">
                    {a.kind.replace("_", " ")} {a.section ? `· ${SAT_SECTION_LABELS[a.section]}` : ""}
                  </span>
                  <span className="text-text-muted">{a.submittedAt?.toLocaleDateString("en-NG")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
