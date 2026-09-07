import Link from "next/link";
import type { ExamType } from "@prisma/client";
import type { ExamSubjectReadiness } from "@/lib/practice/readiness-service";
import { examSlugFor } from "@/lib/exam-slugs";
import { ReadinessScore } from "@/components/readiness/readiness-score";

export function SubjectReadinessCard({ exam, subject }: { exam: ExamType; subject: ExamSubjectReadiness }) {
  return (
    <Link
      href={`/practice/${examSlugFor(exam)}/readiness/${subject.subjectId}`}
      className="block rounded-xl border border-border bg-surface-raised p-4 transition hover:border-border-strong"
    >
      <ReadinessScore label={subject.subjectName} pct={subject.readinessPct} status={subject.status} size="sm" />
    </Link>
  );
}
