import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import {
  addQuizQuestion,
  submitLessonForReview,
  addLessonChapter,
  addCheckpoint,
} from "@/app/dashboard/teacher/courses/actions";
import { QuizCsvImportForm } from "@/components/educom/quiz-csv-import-form";

const MODERATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft — not submitted for review yet",
  SUBMITTED: "Submitted — waiting for an admin to review",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved — waiting to be published",
  PUBLISHED: "Published — live for students",
  REJECTED: "Rejected",
  NEEDS_CHANGES: "Changes requested — see the note below",
  SUSPENDED: "Suspended by an administrator",
};

export default async function ManageLessonPage({
  params,
}: PageProps<"/dashboard/teacher/courses/[courseId]/lessons/[lessonId]">) {
  const { courseId, lessonId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const teacher = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) redirect("/dashboard");

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { course: true } },
      quizQuestions: { where: { atSeconds: null }, orderBy: { order: "asc" } },
      chapters: { orderBy: { order: "asc" }, include: { checkpoints: true } },
    },
  });
  if (!lesson || lesson.module.course.id !== courseId || lesson.module.course.teacherId !== teacher.id) {
    notFound();
  }

  const canSubmitForReview = lesson.moderationStatus === "DRAFT" || lesson.moderationStatus === "NEEDS_CHANGES";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/dashboard/teacher/courses/${courseId}`}
        className="text-sm text-text-secondary hover:text-text-primary"
      >
        ← {lesson.module.course.title}
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{lesson.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{lesson.type} lesson</p>
        </div>
        {canSubmitForReview && (
          <form action={submitLessonForReview}>
            <input type="hidden" name="lessonId" value={lesson.id} />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-brand px-4 py-2 text-xs font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Submit for review
            </button>
          </form>
        )}
      </div>
      <p className="mt-2 text-xs text-warning">
        {MODERATION_STATUS_LABELS[lesson.moderationStatus] ?? lesson.moderationStatus}
      </p>
      {lesson.moderationReason && (
        <p className="mt-1 text-xs text-text-secondary">Reviewer note: {lesson.moderationReason}</p>
      )}

      {lesson.type !== "QUIZ" ? (
        <p className="mt-6 rounded-lg border border-border bg-surface-raised p-4 text-sm text-text-secondary">
          {lesson.content || "No content added yet."}
        </p>
      ) : (
        <div className="mt-6">
          <Card title="Quiz questions">
            {lesson.quizQuestions.length === 0 ? (
              <p className="text-sm text-text-secondary">No questions yet.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {lesson.quizQuestions.map((q, i) => (
                  <li key={q.id} className="rounded-lg border border-border bg-surface p-3">
                    <p className="text-text-primary">
                      {i + 1}. {q.prompt}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Correct answer: {q.correctOption}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            <form action={addQuizQuestion} className="mt-4 space-y-2">
              <input type="hidden" name="lessonId" value={lesson.id} />
              <textarea
                name="prompt"
                required
                placeholder="Question"
                rows={2}
                className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
              {["A", "B", "C", "D"].map((key) => (
                <input
                  key={key}
                  type="text"
                  name={`option${key}`}
                  required
                  placeholder={`Option ${key}`}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                />
              ))}
              <div>
                <label className="block text-xs text-text-secondary" htmlFor="correctOption">
                  Correct option
                </label>
                <select
                  id="correctOption"
                  name="correctOption"
                  required
                  className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                >
                  {["A", "B", "C", "D"].map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Add question
              </button>
            </form>

            <QuizCsvImportForm lessonId={lesson.id} />
          </Card>
        </div>
      )}

      {lesson.type === "VIDEO" && (
        <div className="mt-6 space-y-6">
          <Card title={`Chapters (${lesson.chapters.length})`}>
            {lesson.chapters.length === 0 ? (
              <p className="text-sm text-text-secondary">No chapters yet — add timestamps so students can jump around the video.</p>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {lesson.chapters.map((c) => (
                  <li key={c.id} className="rounded-lg border border-border bg-surface p-3">
                    <p className="text-text-primary">
                      {Math.floor(c.startSeconds / 60)}:{String(c.startSeconds % 60).padStart(2, "0")} — {c.title}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            <form action={addLessonChapter} className="mt-4 space-y-2">
              <input type="hidden" name="lessonId" value={lesson.id} />
              <div className="flex gap-2">
                <input
                  type="number"
                  name="startSeconds"
                  min={0}
                  required
                  placeholder="Start (seconds)"
                  className="w-40 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                />
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Chapter title"
                  className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                />
              </div>
              <textarea
                name="transcriptSegment"
                placeholder="This chapter's transcript segment (optional — grounds the AI tutor)"
                rows={2}
                className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
              <button
                type="submit"
                className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
              >
                Add chapter
              </button>
            </form>
          </Card>

          <Card title={`Interactive checkpoints (${lesson.chapters.reduce((n, c) => n + c.checkpoints.length, 0)})`}>
            {lesson.chapters.every((c) => c.checkpoints.length === 0) ? (
              <p className="text-sm text-text-secondary">
                No checkpoints yet — a checkpoint pauses the video at a timestamp and asks the student a
                question.
              </p>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {lesson.chapters
                  .flatMap((c) => c.checkpoints)
                  .map((cp) => (
                    <li key={cp.id} className="rounded-lg border border-border bg-surface p-3">
                      <p className="text-text-primary">
                        {Math.floor((cp.atSeconds ?? 0) / 60)}:{String((cp.atSeconds ?? 0) % 60).padStart(2, "0")} — {cp.prompt}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">Correct answer: {cp.correctOption}</p>
                    </li>
                  ))}
              </ol>
            )}
            <form action={addCheckpoint} className="mt-4 space-y-2">
              <input type="hidden" name="lessonId" value={lesson.id} />
              <div className="flex gap-2">
                <input
                  type="number"
                  name="atSeconds"
                  min={0}
                  required
                  placeholder="Timestamp (seconds)"
                  className="w-40 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                />
                <select
                  name="chapterId"
                  className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                >
                  <option value="">No specific chapter</option>
                  {lesson.chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                name="prompt"
                required
                placeholder="Question"
                rows={2}
                className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
              {["A", "B", "C", "D"].map((key) => (
                <input
                  key={key}
                  type="text"
                  name={`option${key}`}
                  required
                  placeholder={`Option ${key}`}
                  className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                />
              ))}
              <div>
                <label className="block text-xs text-text-secondary" htmlFor="checkpointCorrectOption">
                  Correct option
                </label>
                <select
                  id="checkpointCorrectOption"
                  name="correctOption"
                  required
                  className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                >
                  {["A", "B", "C", "D"].map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                name="explanation"
                placeholder="Explanation shown after the student answers (optional)"
                rows={2}
                className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Add checkpoint
              </button>
            </form>
          </Card>

          {lesson.notesMarkdown && (
            <Card title="Notes">
              <pre className="whitespace-pre-wrap text-sm text-text-secondary">{lesson.notesMarkdown}</pre>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
