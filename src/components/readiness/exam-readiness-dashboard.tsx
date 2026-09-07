import Link from "next/link";
import type { ExamType } from "@prisma/client";
import type { BiggestOpportunity, ExamReadiness, ReadinessTrend as ReadinessTrendData } from "@/lib/practice/readiness-service";
import { examLabels, examSlugFor } from "@/lib/exam-slugs";
import { ReadinessScore } from "@/components/readiness/readiness-score";
import { SubjectReadinessCard } from "@/components/readiness/subject-readiness-card";
import { ReadinessTrend } from "@/components/readiness/readiness-trend";

export function ExamReadinessDashboard({
  exam,
  readiness,
  opportunity,
  trend,
}: {
  exam: ExamType;
  readiness: ExamReadiness;
  opportunity: BiggestOpportunity;
  trend: ReadinessTrendData;
}) {
  const slug = examSlugFor(exam);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center">
        <ReadinessScore label={`My ${examLabels[exam]} Readiness`} pct={readiness.overall.readinessPct} status={readiness.overall.status} />
        <Link
          href={`/practice/${slug}/drills`}
          className="mt-4 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
        >
          Start a Drill
        </Link>
      </div>

      {readiness.overall.readinessPct === null && (
        <p className="rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-secondary">
          Not enough data yet — complete a few practice questions in at least one subject to see your{" "}
          {examLabels[exam]} readiness.
        </p>
      )}

      {opportunity && (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-text">Your Biggest Opportunity This Week</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">{opportunity.subjectName}</p>
          {opportunity.topics.length > 0 && (
            <>
              <p className="mt-3 text-sm font-medium text-text-secondary">Focus this week</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-text-secondary">
                {opportunity.topics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ol>
            </>
          )}
          <Link
            href={`/practice/${slug}/readiness/${opportunity.subjectId}`}
            className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Practice {opportunity.subjectName}
          </Link>
        </div>
      )}

      {readiness.subjects.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-text-secondary">Subjects</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {readiness.subjects.map((subject) => (
              <SubjectReadinessCard key={subject.subjectId} exam={exam} subject={subject} />
            ))}
          </div>
        </div>
      )}

      <ReadinessTrend trend={trend} />
    </div>
  );
}
