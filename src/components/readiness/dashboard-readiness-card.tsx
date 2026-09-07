import Link from "next/link";
import type { ExamType } from "@prisma/client";
import type { ExamReadiness } from "@/lib/practice/readiness-service";
import { READINESS_STATUS_META } from "@/lib/practice/readiness-service";
import { examLabels, examSlugFor } from "@/lib/exam-slugs";

/** Compact dashboard widget — item 10. Links into the full
 * ExamReadinessDashboard at /practice/[exam]/readiness. */
export function DashboardReadinessCard({ exam, readiness }: { exam: ExamType; readiness: ExamReadiness }) {
  const scored = readiness.subjects.filter((s) => s.readinessPct !== null);
  const strongest = scored.length ? scored.reduce((max, s) => ((s.readinessPct ?? 0) > (max.readinessPct ?? 0) ? s : max)) : null;
  const weakest = scored.length ? scored.reduce((min, s) => ((s.readinessPct ?? 0) < (min.readinessPct ?? 0) ? s : min)) : null;
  const meta = READINESS_STATUS_META[readiness.overall.status];

  return (
    <Link
      href={`/practice/${examSlugFor(exam)}/readiness`}
      className="block rounded-xl border border-border bg-surface-raised p-5 transition hover:border-border-strong"
    >
      <p className="text-sm font-medium text-text-secondary">{examLabels[exam]} Readiness</p>
      <p className="mt-1 text-2xl font-semibold text-text-primary">
        {readiness.overall.readinessPct === null ? "—" : `${readiness.overall.readinessPct}%`} — {meta.emoji} {meta.label}
      </p>
      {strongest && (
        <p className="mt-2 text-xs text-text-secondary">
          Strongest: {strongest.subjectName} — {strongest.readinessPct}%
        </p>
      )}
      {weakest && weakest.subjectId !== strongest?.subjectId && (
        <p className="text-xs text-text-secondary">
          Needs Attention: {weakest.subjectName} — {weakest.readinessPct}%
        </p>
      )}
      <p className="mt-3 text-sm font-medium text-brand-text">Continue Preparing →</p>
    </Link>
  );
}
