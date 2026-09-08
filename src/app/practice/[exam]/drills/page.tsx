import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { examLabels, examSlugs } from "@/lib/exam-slugs";
import { requireStudentSession } from "@/lib/exam-access";
import { getExamSubjectScope, getExamReadiness } from "@/lib/practice/readiness-service";
import { hasExamProfile } from "@/lib/practice/exam-profile-service";
import { getDrillConfig } from "@/lib/practice/exam-drill-config";
import { QuickDrillSelector } from "@/components/readiness/quick-drill-selector";

export default async function QuickDrillsPage({ params }: PageProps<"/practice/[exam]/drills">) {
  const { exam: examSlug } = await params;
  const exam = examSlugs[examSlug];
  if (!exam) notFound();

  const session = await requireStudentSession(`/practice/${examSlug}/drills`);

  if (!(await hasExamProfile(session.user.id, exam))) {
    redirect(`/practice/${examSlug}/subjects`);
  }

  const [subjects, config, readiness] = await Promise.all([
    getExamSubjectScope(session.user.id, exam),
    getDrillConfig(exam),
    getExamReadiness(session.user.id, exam),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href={`/practice/${examSlug}`} className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to {examLabels[exam]} practice
      </Link>
      <h1 className="mt-4 text-h1 font-semibold text-text-primary">{examLabels[exam]} Quick Drills</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Short on time? Pick a quick drill instead of a full practice session.
      </p>
      <p className="mt-2">
        <Link href={`/practice/${examSlug}/subjects`} className="text-sm text-brand-text hover:underline">
          Manage My Subjects
        </Link>
      </p>

      {subjects.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-secondary">
          No questions are available for {examLabels[exam]} yet. Check back soon.
        </p>
      ) : (
        <div className="mt-8">
          <QuickDrillSelector exam={exam} subjects={subjects} config={config} readiness={readiness} />
        </div>
      )}

      <p className="mt-6 text-sm text-text-secondary">
        Want to choose your own subjects and question count instead?{" "}
        <Link href={`/practice/${examSlug}`} className="text-brand-text hover:underline">
          Use the full setup →
        </Link>
      </p>
    </div>
  );
}
