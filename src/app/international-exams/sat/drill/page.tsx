import { notFound } from "next/navigation";
import Link from "next/link";
import type { SatSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { isSatEnabled, SAT_CONFIG } from "@/lib/sat/config";
import { SatDrillPicker, type DrillDomainOption } from "@/components/sat/sat-drill-picker";
import { computeAdaptiveDrillPlan } from "@/lib/sat/drill-service";
import { startDrill, startAdaptiveDrill, startTodaysDrill } from "@/app/international-exams/sat/drill/actions";
import { requireStudentSession, requireExamProductEntitlement } from "@/lib/exam-access";

export default async function SatDrillHubPage() {
  if (!isSatEnabled()) notFound();
  const session = await requireStudentSession("/international-exams/sat/drill");
  await requireExamProductEntitlement(session.user.id, "SAT");

  const [publishedContent, todaysPlan] = await Promise.all([
    prisma.satContent.findMany({
      where: { status: "PUBLISHED" },
      select: { section: true, domain: true, skill: true },
      distinct: ["section", "domain", "skill"],
    }),
    computeAdaptiveDrillPlan(session.user.id, SAT_CONFIG.drill.dailyDrillSize),
  ]);

  const domainsBySection = { READING_WRITING: [], MATH: [] } as Record<SatSection, DrillDomainOption[]>;
  for (const row of publishedContent) {
    const list = domainsBySection[row.section];
    let entry = list.find((d) => d.domain === row.domain);
    if (!entry) {
      entry = { domain: row.domain, skills: [] };
      list.push(entry);
    }
    if (row.skill && !entry.skills.includes(row.skill)) entry.skills.push(row.skill);
  }

  const todaysEstimateMin = Math.max(1, Math.round(todaysPlan.items.length * 1.2));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/international-exams/sat" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to SAT Prep
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">SAT Drills</h1>
      <p className="mt-2 text-text-secondary">
        Short, focused question sets — build mastery without committing to a full practice session.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/international-exams/sat/drill/history"
          className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
        >
          Drill History →
        </Link>
      </div>

      {todaysPlan.items.length > 0 && (
        <div className="mt-6">
          <Card title="Today's SAT Drill">
            <p className="text-sm text-text-secondary">
              {todaysPlan.items.length} Questions · ~{todaysEstimateMin} Minutes · Focus: {todaysPlan.primaryLabel}
            </p>
            <form action={startTodaysDrill} className="mt-3">
              <input type="hidden" name="timer" value="off" />
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Start Today&apos;s Drill
              </button>
            </form>
          </Card>
        </div>
      )}

      {todaysPlan.items.length > 0 && (
        <div className="mt-4">
          <Card title="Adaptive Drill — Recommended for You">
            <p className="text-sm text-text-secondary">
              {SAT_CONFIG.drill.adaptiveDefaultSize} questions, personalized from your own SmartPrepAfrica practice
              history — not official College Board adaptive testing.
            </p>
            <form action={startAdaptiveDrill} className="mt-3">
              <input type="hidden" name="timer" value="off" />
              <button
                type="submit"
                className="rounded-lg border border-brand/50 px-4 py-2 text-sm font-medium text-brand-text hover:border-brand"
              >
                Start Adaptive Drill
              </button>
            </form>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card title="Start a Drill">
          <SatDrillPicker domainsBySection={domainsBySection} action={startDrill} />
        </Card>
      </div>
    </div>
  );
}
