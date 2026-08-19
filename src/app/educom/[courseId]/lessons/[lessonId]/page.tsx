import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markLessonComplete, submitQuiz } from "@/app/educom/actions";
import { startAttempt } from "@/app/practice/actions";
import { asOptions } from "@/lib/practice-types";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";

function renderContent(content: string) {
  const segments = content.split("```");
  return segments.map((segment, i) => {
    if (i % 2 === 1) {
      const [, ...rest] = segment.split("\n");
      const code = rest.join("\n").trim();
      return (
        <pre
          key={i}
          className="my-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300"
        >
          <code>{code}</code>
        </pre>
      );
    }
    return segment
      .split("\n\n")
      .filter((p) => p.trim())
      .map((para, j) => (
        <p key={`${i}-${j}`} className="mt-4 leading-relaxed text-slate-300 first:mt-0">
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
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!course) notFound();

  const flatLessons = course.modules.flatMap((m) => m.lessons);
  const currentIndex = flatLessons.findIndex((l) => l.id === lessonId);
  if (currentIndex === -1) notFound();

  const lesson = flatLessons[currentIndex];
  const prevLesson = flatLessons[currentIndex - 1];
  const nextLesson = flatLessons[currentIndex + 1];

  const [enrollment, quizQuestions] = await Promise.all([
    prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
      include: { lessonProgress: { where: { lessonId } } },
    }),
    lesson.type === "QUIZ"
      ? prisma.quizQuestion.findMany({ where: { lessonId }, orderBy: { order: "asc" } })
      : Promise.resolve([]),
  ]);
  if (!enrollment) redirect(`/educom/${courseId}`);

  const progress = enrollment.lessonProgress[0];
  const isComplete = !!progress?.completedAt;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/educom/${courseId}`}
        className="text-sm text-slate-400 hover:text-white"
      >
        ← {course.title}
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">
            Lesson {currentIndex + 1} of {flatLessons.length}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{lesson.title}</h1>
        </div>
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
      </div>

      {lesson.type === "VIDEO" && lesson.videoUrl && (
        <video
          controls
          src={lesson.videoUrl}
          className="mt-6 w-full rounded-lg border border-slate-800"
        />
      )}

      <div className="mt-2">
        {lesson.content && renderContent(lesson.content)}
      </div>

      {lesson.type === "QUIZ" && (
        <div className="mt-6">
          {isComplete ? (
            <div className="rounded-lg border border-green-800 bg-green-900/30 px-4 py-3 text-sm text-green-300">
              Quiz score: {Math.round(progress!.score ?? 0)}%
            </div>
          ) : quizQuestions.length === 0 ? (
            <p className="text-sm text-slate-400">
              No questions have been added to this quiz yet.
            </p>
          ) : (
            <form action={submitQuiz.bind(null, lesson.id)} className="space-y-5">
              {quizQuestions.map((q, i) => (
                <div key={q.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm font-medium text-slate-200">
                    {i + 1}. {q.prompt}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {asOptions(q.options).map((option) => (
                      <label
                        key={option.key}
                        className="flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300 hover:border-slate-600"
                      >
                        <input
                          type="radio"
                          name={`question_${q.id}`}
                          value={option.key}
                          required
                          className="accent-orange-500"
                        />
                        <span className="font-semibold text-orange-400">{option.key}</span>
                        {option.text}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="submit"
                className="rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
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
                className="rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
              >
                Mark complete
              </button>
            </form>
          ) : (
            <span className="rounded-full border border-green-800 bg-green-900/30 px-4 py-2 text-sm text-green-300">
              ✓ Completed
            </span>
          )}
        </div>
      )}

      {lesson.topic && course.subjectId && (
        <div className="mt-8 rounded-lg border border-orange-800 bg-orange-950/30 p-4">
          <p className="text-sm font-medium text-orange-300">
            Practice what you learned
          </p>
          <p className="mt-1 text-xs text-slate-400">
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
              className="rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Practice: {lesson.topic}
            </button>
          </form>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-6">
        {prevLesson ? (
          <Link
            href={`/educom/${courseId}/lessons/${prevLesson.id}`}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← {prevLesson.title}
          </Link>
        ) : (
          <span />
        )}
        {nextLesson ? (
          <Link
            href={`/educom/${courseId}/lessons/${nextLesson.id}`}
            className="text-sm font-medium text-orange-400 hover:text-orange-300"
          >
            {nextLesson.title} →
          </Link>
        ) : (
          <Link
            href={`/educom/${courseId}`}
            className="text-sm font-medium text-orange-400 hover:text-orange-300"
          >
            Back to course overview →
          </Link>
        )}
      </div>
    </div>
  );
}
