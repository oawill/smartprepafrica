import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { examLabels, examSlugs } from "@/lib/exam-slugs";
import { requireStudentSession } from "@/lib/exam-access";
import {
  getExamProfile,
  suggestSubjectsFromHistory,
  getCompulsorySubjectNames,
} from "@/lib/practice/exam-profile-service";
import { SubjectSelectionForm } from "@/components/readiness/subject-selection-form";

export default async function ExamSubjectsPage({ params }: PageProps<"/practice/[exam]/subjects">) {
  const { exam: examSlug } = await params;
  const exam = examSlugs[examSlug];
  if (!exam) notFound();

  const session = await requireStudentSession(`/practice/${examSlug}/subjects`);
  const userId = session.user.id;

  const [allSubjects, profile, subjectsWithActivity] = await Promise.all([
    prisma.subject.findMany({
      where: { questions: { some: { exam, status: "PUBLISHED" } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getExamProfile(userId, exam),
    prisma.subject.findMany({
      where: { examAttempts: { some: { exam, userId } } },
      select: { id: true },
    }),
  ]);

  const hasProfile = !!profile;
  const suggested = hasProfile ? [] : await suggestSubjectsFromHistory(userId, exam);
  const initialSelectedIds = hasProfile ? profile.subjects.map((s) => s.id) : suggested.map((s) => s.id);
  const compulsoryNames = getCompulsorySubjectNames(exam);

  let waecSubjects: { id: string; name: string }[] | undefined;
  if (exam === "NECO") {
    const waecProfile = await getExamProfile(userId, "WAEC");
    waecSubjects = waecProfile?.subjects;
  }

  const heading = hasProfile
    ? `Manage My ${examLabels[exam]} Subjects`
    : suggested.length > 0
      ? "We found subjects you've previously studied"
      : `Which subjects are you preparing for?`;

  const subheading = hasProfile
    ? "Your Readiness Dashboard, Quick Drills and recommendations only use these subjects."
    : suggested.length > 0
      ? "Confirm the subjects below, or adjust them — this becomes your personal preparation profile."
      : "Choose the subjects you're actually preparing for. You can change this anytime.";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/practice/${examSlug}`} className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to {examLabels[exam]} practice
      </Link>
      <h1 className="mt-4 text-h1 font-semibold text-text-primary">
        {hasProfile ? heading : `My ${examLabels[exam]} Subjects`}
      </h1>
      {!hasProfile && <p className="mt-1 text-sm font-medium text-text-secondary">{heading}</p>}
      <p className="mt-2 text-sm text-text-secondary">{subheading}</p>

      {allSubjects.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-surface-raised p-5 text-sm text-text-secondary">
          No questions are available for {examLabels[exam]} yet. Check back soon.
        </p>
      ) : (
      <div className="mt-8">
        <SubjectSelectionForm
          exam={exam}
          allSubjects={allSubjects}
          initialSelectedIds={initialSelectedIds}
          compulsoryNames={compulsoryNames}
          subjectIdsWithActivity={subjectsWithActivity.map((s) => s.id)}
          useWaecSubjects={waecSubjects}
        />
      </div>
      )}
    </div>
  );
}
