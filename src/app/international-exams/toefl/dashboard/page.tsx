import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { SkillReadinessCard } from "@/components/toefl/skill-readiness-card";
import { ToeflEmptyState } from "@/components/toefl/toefl-empty-state";
import { isToeflEnabled } from "@/lib/toefl/config";
import { TOEFL_SKILL_LABELS } from "@/lib/toefl/types";
import type { ToeflSkill } from "@prisma/client";

export const metadata: Metadata = {
  title: "TOEFL Dashboard",
};

export default async function ToeflDashboardPage() {
  if (!isToeflEnabled()) notFound();

  const session = await requireStudentSession("/international-exams/toefl/dashboard");
  await requireExamProductEntitlement(session.user.id, "TOEFL");
  const userId = session.user.id;

  const attempts = await prisma.toeflAttempt.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    include: { items: true },
  });

  const submitted = attempts.filter((a) => a.submittedAt !== null);
  // Already ordered most-recent-first (orderBy startedAt desc above). Each
  // skill's score comes from the most recent attempt that actually set
  // it — a single-skill practice attempt only ever fills in its own
  // score field, so picking one row for all four (as Phase 1 did) would
  // hide every skill practice result. Overall stays sourced only from a
  // DIAGNOSTIC/MOCK_EXAM row, never averaged from partial skill data.
  const overallSource = submitted.find((a) => a.overallScore !== null);
  const skillScores: Record<ToeflSkill, number | null> = {
    READING: submitted.find((a) => a.readingScore !== null)?.readingScore ?? null,
    LISTENING: submitted.find((a) => a.listeningScore !== null)?.listeningScore ?? null,
    SPEAKING: submitted.find((a) => a.speakingScore !== null)?.speakingScore ?? null,
    WRITING: submitted.find((a) => a.writingScore !== null)?.writingScore ?? null,
  };

  const scoredSkills = (Object.entries(skillScores) as [ToeflSkill, number | null][]).filter(
    ([, score]) => score !== null
  ) as [ToeflSkill, number][];
  const strongestSkill = scoredSkills.length
    ? scoredSkills.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    : null;
  const weakestSkill = scoredSkills.length
    ? scoredSkills.reduce((a, b) => (b[1] < a[1] ? b : a))[0]
    : null;

  const questionsCompleted = submitted.reduce((sum, a) => sum + a.items.length, 0);
  const practiceTimeMinutes = Math.round(
    submitted.reduce(
      (sum, a) => sum + a.items.reduce((s, i) => s + (i.timeSpentSecs ?? i.speakingDurationSec ?? 0), 0),
      0
    ) / 60
  );

  // Real streak computed from distinct submission dates — no fabricated
  // numbers. Empty until a student has actually completed an attempt.
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
      <Link href="/international-exams/toefl" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to TOEFL overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">TOEFL Readiness</h1>
      <p className="mt-2 text-sm text-text-secondary">Estimated SmartPrepAfrica TOEFL Readiness Score.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SkillReadinessCard label="Overall" score={overallSource?.overallScore ?? null} />
        <SkillReadinessCard label="Reading" score={skillScores.READING} />
        <SkillReadinessCard label="Listening" score={skillScores.LISTENING} />
        <SkillReadinessCard label="Speaking" score={skillScores.SPEAKING} />
        <SkillReadinessCard label="Writing" score={skillScores.WRITING} />
      </div>

      {!hasData ? (
        <div className="mt-8">
          <ToeflEmptyState message="Complete a diagnostic test to see your TOEFL readiness." />
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
              {strongestSkill ? TOEFL_SKILL_LABELS[strongestSkill] : "--"} /{" "}
              {weakestSkill ? TOEFL_SKILL_LABELS[weakestSkill] : "--"}
            </p>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <Card title="Recent Activity">
          {submitted.length === 0 ? (
            <ToeflEmptyState message="No TOEFL practice activity yet." />
          ) : (
            <ul className="space-y-2 text-sm">
              {submitted.slice(0, 10).map((a) => (
                <li key={a.id} className="flex justify-between border-b border-border pb-1.5 last:border-0">
                  <span className="text-text-secondary">
                    {a.kind.replace("_", " ")} {a.skill ? `· ${TOEFL_SKILL_LABELS[a.skill]}` : ""}
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
