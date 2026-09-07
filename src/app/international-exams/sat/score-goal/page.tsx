import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { isSatEnabled, SAT_CONFIG } from "@/lib/sat/config";
import { getScoreGoal } from "@/lib/sat/score-goal-service";
import { saveSatScoreGoal } from "@/app/international-exams/sat/score-goal/actions";

export const metadata: Metadata = {
  title: "SAT Score Goal",
};

export default async function SatScoreGoalPage() {
  if (!isSatEnabled()) notFound();
  const session = await requireStudentSession("/international-exams/sat/score-goal");
  await requireExamProductEntitlement(session.user.id, "SAT");
  const userId = session.user.id;

  const [goal, latestScored] = await Promise.all([
    getScoreGoal(userId),
    prisma.satAttempt.findFirst({
      where: { userId, overallScore: { not: null } },
      orderBy: { startedAt: "desc" },
      select: { overallScore: true },
    }),
  ]);

  const currentScore = latestScored?.overallScore ?? null;
  const pointsToGo = goal && currentScore !== null ? goal.targetScore - currentScore : null;
  const daysToTest = goal?.testDate
    ? Math.ceil((goal.testDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const testDateValue = goal?.testDate ? goal.testDate.toISOString().slice(0, 10) : "";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/international-exams/sat" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to SAT overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Score Goal</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Set a target composite score and, optionally, a test date. This tracks where you stand against your goal —
        it isn&apos;t a prediction or promise of a particular score improvement.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card title="Current Estimate">
          <div className="text-2xl font-semibold text-text-primary">
            {currentScore ?? "--"}
            <span className="text-sm font-normal text-text-muted"> / {SAT_CONFIG.scoreScale.compositeMax}</span>
          </div>
        </Card>
        <Card title="Target">
          <div className="text-2xl font-semibold text-text-primary">
            {goal?.targetScore ?? "--"}
            <span className="text-sm font-normal text-text-muted"> / {SAT_CONFIG.scoreScale.compositeMax}</span>
          </div>
        </Card>
        <Card title="Points to Goal">
          <div className="text-2xl font-semibold text-text-primary">{pointsToGo !== null ? pointsToGo : "--"}</div>
        </Card>
      </div>

      {daysToTest !== null && (
        <p className="mt-3 text-xs text-text-muted">
          {daysToTest > 0
            ? `${daysToTest} day${daysToTest === 1 ? "" : "s"} until your test date.`
            : daysToTest === 0
              ? "Your test date is today."
              : "Your test date has passed."}
        </p>
      )}

      <div className="mt-8">
        <Card title={goal ? "Update Your Goal" : "Set a Goal"}>
          <form action={saveSatScoreGoal} className="space-y-4">
            <div>
              <label htmlFor="targetScore" className="block text-sm font-medium text-text-primary">
                Target composite score
              </label>
              <input
                type="number"
                id="targetScore"
                name="targetScore"
                min={SAT_CONFIG.scoreScale.compositeMin}
                max={SAT_CONFIG.scoreScale.compositeMax}
                step={10}
                defaultValue={goal?.targetScore ?? ""}
                required
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="testDate" className="block text-sm font-medium text-text-primary">
                Test date (optional)
              </label>
              <input
                type="date"
                id="testDate"
                name="testDate"
                defaultValue={testDateValue}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              {goal ? "Update Goal" : "Save Goal"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
