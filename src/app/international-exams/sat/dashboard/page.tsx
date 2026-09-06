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

export const metadata: Metadata = {
  title: "SAT Dashboard",
};

export default async function SatDashboardPage() {
  if (!isSatEnabled()) notFound();

  const session = await auth();
  if (!session) redirect("/login");
  const userId = session.user.id;

  const attempts = await prisma.satAttempt.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    include: { items: { include: { content: true } } },
  });

  const submitted = attempts.filter((a) => a.submittedAt !== null);
  // Most-recent-first (orderBy startedAt desc). Each section score comes
  // from the most recent attempt that actually set it, same pattern as
  // the TOEFL dashboard — a single-section practice attempt only ever
  // fills in its own score column.
  const overallSource = submitted.find((a) => a.overallScore !== null);
  const readingWritingScore = submitted.find((a) => a.readingWritingScore !== null)?.readingWritingScore ?? null;
  const mathScore = submitted.find((a) => a.mathScore !== null)?.mathScore ?? null;

  const domainStats = new Map<string, { correct: number; total: number }>();
  for (const attempt of submitted) {
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
          <Card title="Practice Time">
            <p className="text-2xl font-semibold text-text-primary">{practiceTimeMinutes}m</p>
          </Card>
          <Card title="Strongest / Weakest Skill">
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
