import Link from "next/link";
import { notFound } from "next/navigation";
import { examLabels, examSlugs } from "@/lib/exam-slugs";
import { requireStudentSession } from "@/lib/exam-access";
import { getExamReadiness, getBiggestOpportunity, getReadinessTrend } from "@/lib/practice/readiness-service";
import { ExamReadinessDashboard } from "@/components/readiness/exam-readiness-dashboard";

export default async function ExamReadinessPage({ params }: PageProps<"/practice/[exam]/readiness">) {
  const { exam: examSlug } = await params;
  const exam = examSlugs[examSlug];
  if (!exam) notFound();

  const session = await requireStudentSession(`/practice/${examSlug}/readiness`);

  const [readiness, trend] = await Promise.all([
    getExamReadiness(session.user.id, exam),
    getReadinessTrend(session.user.id, exam),
  ]);
  const opportunity = await getBiggestOpportunity(session.user.id, exam, readiness);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/practice/${examSlug}`} className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to {examLabels[exam]} practice
      </Link>
      <h1 className="mt-4 text-h1 font-semibold text-text-primary">My {examLabels[exam]} Readiness</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Estimated from your practice history — not a guarantee of exam results.
      </p>

      <div className="mt-8">
        <ExamReadinessDashboard exam={exam} readiness={readiness} opportunity={opportunity} trend={trend} />
      </div>
    </div>
  );
}
