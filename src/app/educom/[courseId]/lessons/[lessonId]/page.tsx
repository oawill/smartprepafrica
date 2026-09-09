import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markLessonComplete, submitQuiz } from "@/app/educom/actions";
import { startAttempt } from "@/app/practice/actions";
import { startTopicDrill } from "@/app/practice/drills/actions";
import { findExistingCrossoverSuggestion } from "@/lib/learning/prep-crossover";
import { asOptions } from "@/lib/practice-types";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";
import { LessonTabs } from "@/components/lesson-player/lesson-tabs";
import { resolveVideoSource } from "@/lib/video/resolve-video-source";
import { Badge } from "@/components/ui/badge";

function renderContent(content: string) {
  const segments = content.split("```");
  return segments.map((segment, i) => {
    if (i % 2 === 1) {
      const [, ...rest] = segment.split("\n");
      const code = rest.join("\n").trim();
      return (
        <pre
          key={i}
          className="my-4 overflow-x-auto rounded-lg border border-border bg-surface-raised p-4 text-sm text-text-secondary"
        >
          <code>{code}</code>
        </pre>
      );
    }
    return segment
      .split("\n\n")
      .filter((p) => p.trim())
      .map((para, j) => (
        <p key={`${i}-${j}`} className="mt-4 leading-relaxed text-text-secondary first:mt-0">
          {para}
        </p>
      ));
  });
}

export default async function LessonPage({
  params,
}: PageProps<"/educom/[courseId]/lessons/[lessonId]">) {
  const { courseId, lessonId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            where: {
              moderationStatus: "PUBLISHED",
              OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
            },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const flatLessons = course.modules.flatMap((m) => m.lessons);
  const currentIndex = flatLessons.findIndex((l) => l.id === lessonId);
  if (currentIndex === -1) notFound();

  const lessonSummary = flatLessons[currentIndex];
  const prevLesson = flatLessons[currentIndex - 1];
  const nextLesson = flatLessons[currentIndex + 1];

  const [enrollment, quizQuestions, lesson, checkpointRows] = await Promise.all([
    prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
      include: { lessonProgress: { where: { lessonId } } },
    }),
    lessonSummary.type === "QUIZ"
      ? prisma.quizQuestion.findMany({ where: { lessonId, atSeconds: null }, orderBy: { order: "asc" } })
      : Promise.resolve([]),
    prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: { chapters: { orderBy: { order: "asc" } } },
    }),
    prisma.quizQuestion.findMany({
      where: { lessonId, atSeconds: { not: null } },
      orderBy: { atSeconds: "asc" },
    }),
  ]);
  if (!enrollment) redirect(`/educom/${courseId}`);

  const progress = enrollment.lessonProgress[0];
  const isComplete = !!progress?.completedAt;

  const prepDrillSuggestion =
    isComplete && lesson.type === "QUIZ" && lesson.topic && course.subjectId
      ? await findExistingCrossoverSuggestion({
          userId: session.user.id,
          subjectId: course.subjectId,
          topic: lesson.topic,
        })
      : null;

  const source = lesson.type === "VIDEO" ? resolveVideoSource(lesson) : null;
  const playerChapters = lesson.chapters.map((c) => ({
    id: c.id,
    order: c.order,
    title: c.title,
    startSeconds: c.startSeconds,
    endSeconds: c.endSeconds,
    transcriptSegment: c.transcriptSegment,
  }));
  const playerCheckpoints = checkpointRows.map((cp) => ({
    id: cp.id,
    atSeconds: cp.atSeconds!,
    prompt: cp.prompt,
    options: asOptions(cp.options),
    chapterId: cp.chapterId,
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/educom/${courseId}`}
        className="text-sm text-text-secondary hover:text-text-primary"
      >
        ← {course.title}
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-text-muted">
            Lesson {currentIndex + 1} of {flatLessons.length}
          </p>
          <h1 className="mt-1 text-h2 font-semibold text-text-primary">{lesson.title}</h1>
        </div>
        {lesson.type !== "VIDEO" && (
          <AiCoachPanel
            context={{ courseId, lessonId }}
            defaultMode="EXPLAIN"
            suggestedPrompts={[
              "Explain this lesson simply",
              "Give me an example",
              "Quiz me on this topic",
              "What should I remember for the exam?",
            ]}
          />
        )}
      </div>

      {lesson.type === "VIDEO" ? (
        <div className="mt-6">
          <LessonTabs
            lessonId={lesson.id}
            courseId={courseId}
            source={source}
            chapters={playerChapters}
            checkpoints={playerCheckpoints}
            initialPositionSeconds={progress?.lastPositionSeconds ?? null}
            notesMarkdown={lesson.notesMarkdown}
            transcriptFull={lesson.transcriptFull}
            learningObjectives={lesson.learningObjectives}
            practicePanel={
              lesson.topic && course.subjectId ? (
                <div className="rounded-lg border border-brand/40 bg-brand/10 p-4">
                  <p className="text-sm font-medium text-brand-text">Test what you learned</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Launch a short SmartPrepAfrica drill on {lesson.topic} using the real question bank.
                  </p>
                  <form action={startAttempt} className="mt-3">
                    <input type="hidden" name="exam" value={course.examType ?? "UTME"} />
                    <input type="hidden" name="subjects" value={course.subjectId} />
                    <input type="hidden" name="topic" value={lesson.topic} />
                    <input type="hidden" name="mode" value="STUDY_DRILL" />
                    <input type="hidden" name="count" value="8" />
                    <button
                      type="submit"
                      className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                    >
                      Practice: {lesson.topic}
                    </button>
                  </form>
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  No practice topic is linked to this lesson yet.
                </p>
              )
            }
          />
        </div>
      ) : lesson.type === "PDF" ? (
        <div className="mt-6 space-y-4">
          {lesson.pdfUrl && (
            <a
              href={lesson.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Open PDF
              {lesson.pdfSizeBytes && (
                <span className="opacity-80">
                  (~{(lesson.pdfSizeBytes / (1024 * 1024)).toFixed(1)} MB)
                </span>
              )}
            </a>
          )}
          <div className="mt-2">{lesson.content && renderContent(lesson.content)}</div>
        </div>
      ) : (
        <div className="mt-2">{lesson.content && renderContent(lesson.content)}</div>
      )}

      {lesson.type === "QUIZ" && (
        <div className="mt-6">
          {isComplete ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-success/40 bg-success-surface px-4 py-3 text-sm text-success">
                Quiz score: {Math.round(progress!.score ?? 0)}%
              </div>
              {prepDrillSuggestion && (
                <div className="rounded-lg border border-brand/40 bg-brand/10 p-4">
                  <p className="text-sm font-medium text-brand-text">
                    You&apos;re still working on {prepDrillSuggestion.topic}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Practice it in a {prepDrillSuggestion.exam} drill from the real question bank.
                  </p>
                  <form action={startTopicDrill} className="mt-3">
                    <input type="hidden" name="exam" value={prepDrillSuggestion.exam} />
                    <input type="hidden" name="subjectId" value={prepDrillSuggestion.subjectId} />
                    <input type="hidden" name="topic" value={prepDrillSuggestion.topic} />
                    <button
                      type="submit"
                      className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                    >
                      Practice in a {prepDrillSuggestion.exam} drill
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : quizQuestions.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No questions have been added to this quiz yet.
            </p>
          ) : (
            <form action={submitQuiz.bind(null, lesson.id)} className="space-y-5">
              {quizQuestions.map((q, i) => (
                <div key={q.id} className="rounded-lg border border-border bg-surface-raised p-4">
                  <p className="text-sm font-medium text-text-primary">
                    {i + 1}. {q.prompt}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {asOptions(q.options).map((option) => (
                      <label
                        key={option.key}
                        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:border-border-strong"
                      >
                        <input
                          type="radio"
                          name={`question_${q.id}`}
                          value={option.key}
                          required
                          className="accent-brand"
                        />
                        <span className="font-semibold text-brand-text">{option.key}</span>
                        {option.text}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="submit"
                className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Submit quiz
              </button>
            </form>
          )}
        </div>
      )}

      {lesson.type !== "QUIZ" && (
        <div className="mt-8 flex items-center gap-3">
          {!isComplete ? (
            <form action={markLessonComplete.bind(null, lesson.id)}>
              <button
                type="submit"
                className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Mark complete
              </button>
            </form>
          ) : (
            <Badge tone="success">Completed</Badge>
          )}
        </div>
      )}

      {lesson.type !== "VIDEO" && lesson.topic && course.subjectId && (
        <div className="mt-8 rounded-lg border border-brand/40 bg-brand/10 p-4">
          <p className="text-sm font-medium text-brand-text">
            Practice what you learned
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Launch a short SmartPrepAfrica drill on {lesson.topic} using the
            real question bank.
          </p>
          <form action={startAttempt} className="mt-3">
            <input type="hidden" name="exam" value={course.examType ?? "UTME"} />
            <input type="hidden" name="subjects" value={course.subjectId} />
            <input type="hidden" name="topic" value={lesson.topic} />
            <input type="hidden" name="mode" value="STUDY_DRILL" />
            <input type="hidden" name="count" value="8" />
            <button
              type="submit"
              className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Practice: {lesson.topic}
            </button>
          </form>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        {prevLesson ? (
          <Link
            href={`/educom/${courseId}/lessons/${prevLesson.id}`}
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            ← {prevLesson.title}
          </Link>
        ) : (
          <span />
        )}
        {nextLesson ? (
          <Link
            href={`/educom/${courseId}/lessons/${nextLesson.id}`}
            className="text-sm font-medium text-brand-text hover:underline"
          >
            {nextLesson.title} →
          </Link>
        ) : (
          <Link
            href={`/educom/${courseId}`}
            className="text-sm font-medium text-brand-text hover:underline"
          >
            Back to course overview →
          </Link>
        )}
      </div>
    </div>
  );
}
