import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card } from "@/components/dashboard/card";
import { SatEmptyState } from "@/components/sat/sat-empty-state";
import { isSatEnabled } from "@/lib/sat/config";
import { SAT_SECTION_LABELS } from "@/lib/sat/types";
import { computeStudyPlan } from "@/lib/sat/study-plan-service";

export const metadata: Metadata = {
  title: "SAT Study Plan",
};

export default async function SatStudyPlanPage() {
  if (!isSatEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const plan = await computeStudyPlan(session.user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/international-exams/sat" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to SAT overview
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-text-primary">Study Plan</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Built from your real practice and diagnostic results — not a projection or guaranteed path to a score.
      </p>

      {plan.recommendedNext && (
        <div className="mt-8">
          <Card title="Recommended Next">
            <Link href={plan.recommendedNext.href} className="text-sm text-brand-text hover:underline">
              {plan.recommendedNext.label} →
            </Link>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card title="Focus Areas">
          {!plan.hasAnyData ? (
            <SatEmptyState message="Complete some practice or a diagnostic to get a personalized study plan." />
          ) : plan.focusAreas.length === 0 ? (
            <SatEmptyState message="No weak or unpracticed areas found among your published content — nice work." />
          ) : (
            <ul className="space-y-3">
              {plan.focusAreas.map((area) => (
                <li key={`${area.section}::${area.domain}`} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-text-primary">{area.domain}</p>
                    <p className="text-xs text-text-muted">{SAT_SECTION_LABELS[area.section]}</p>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {area.reason === "unpracticed" ? "Not practiced yet" : `${Math.round((area.accuracy ?? 0) * 100)}% correct`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
