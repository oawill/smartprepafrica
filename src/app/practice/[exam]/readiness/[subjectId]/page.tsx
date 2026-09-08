import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { examLabels, examSlugs } from "@/lib/exam-slugs";
import { requireStudentSession } from "@/lib/exam-access";
import { getTopicMastery } from "@/lib/practice/readiness-service";
import { TopicMastery } from "@/components/readiness/topic-mastery";
import { startWeakAreasDrill } from "@/app/practice/drills/actions";

export default async function SubjectTopicMasteryPage({
  params,
}: PageProps<"/practice/[exam]/readiness/[subjectId]">) {
  const { exam: examSlug, subjectId } = await params;
  const exam = examSlugs[examSlug];
  if (!exam) notFound();

  const session = await requireStudentSession(`/practice/${examSlug}/readiness/${subjectId}`);

  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, name: true } });
  if (!subject) notFound();

  const topics = await getTopicMastery(session.user.id, exam, subjectId);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/practice/${examSlug}/readiness`} className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to {examLabels[exam]} readiness
      </Link>
      <h1 className="mt-4 text-h1 font-semibold text-text-primary">
        {subject.name} — {examLabels[exam]}
      </h1>
      <p className="mt-2 text-sm text-text-secondary">Topic-level mastery, based on your practice history.</p>

      {topics.some((t) => t.status === "WEAK" || t.status === "REVIEW") && (
        <form action={startWeakAreasDrill} className="mt-4">
          <input type="hidden" name="exam" value={exam} />
          <input type="hidden" name="subjectId" value={subject.id} />
          <button
            type="submit"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Practice My Weak Areas
          </button>
        </form>
      )}

      <div className="mt-8">
        <TopicMastery exam={exam} subjectId={subject.id} subjectName={subject.name} topics={topics} />
      </div>
    </div>
  );
}
