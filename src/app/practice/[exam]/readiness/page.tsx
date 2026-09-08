import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { examLabels, examSlugs } from "@/lib/exam-slugs";
import { requireStudentSession } from "@/lib/exam-access";
import { getExamReadiness, getBiggestOpportunity, getReadinessTrend } from "@/lib/practice/readiness-service";
import { hasExamProfile } from "@/lib/practice/exam-profile-service";
import { ExamReadinessDashboard } from "@/components/readiness/exam-readiness-dashboard";

export default async function ExamReadinessPage({
  params,
  searchParams,
}: PageProps<"/practice/[exam]/readiness">) {
  const { exam: examSlug } = await params;
  const { subjectsSaved } = await searchParams;
  const exam = examSlugs[examSlug];
  if (!exam) notFound();

  const session = await requireStudentSession(`/practice/${examSlug}/readiness`);

  if (!(await hasExamProfile(session.user.id, exam))) {
    redirect(`/practice/${examSlug}/subjects`);
  }

  const [readiness, trend] = await Promise.all([
    getExamReadiness(session.user.id, exam),
    getReadinessTrend(session.user.id, exam),
  ]);
  const opportunity = await getBiggestOpportunity(session.user.id, exam, readiness);

  const savedCount = typeof subjectsSaved === "string" ? Number(subjectsSaved) : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/practice/${examSlug}`} className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to {examLabels[exam]} practice
      </Link>
      <h1 className="mt-4 text-h1 font-semibold text-text-primary">My {examLabels[exam]} Readiness</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Estimated from your practice history — not a guarantee of exam results.
      </p>

      {savedCount !== null && Number.isFinite(savedCount) && (
        <p className="mt-4 rounded-lg border border-success/40 bg-success-surface px-4 py-2 text-sm text-success">
          You&apos;re preparing for {examLabels[exam]} with {savedCount} subject{savedCount === 1 ? "" : "s"}.
        </p>
      )}

      <p className="mt-4">
        <Link href={`/practice/${examSlug}/subjects`} className="text-sm text-brand-text hover:underline">
          Manage My Subjects
        </Link>
      </p>

      <div className="mt-8">
        <ExamReadinessDashboard exam={exam} readiness={readiness} opportunity={opportunity} trend={trend} />
      </div>
    </div>
  );
}
