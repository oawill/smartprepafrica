import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { addQuizQuestion } from "@/app/dashboard/teacher/courses/actions";

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
      quizQuestions: { orderBy: { order: "asc" } },
    },
  });
  if (!lesson || lesson.module.course.id !== courseId || lesson.module.course.teacherId !== teacher.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/dashboard/teacher/courses/${courseId}`}
        className="text-sm text-slate-400 hover:text-white"
      >
        ← {lesson.module.course.title}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{lesson.title}</h1>
      <p className="mt-1 text-sm text-slate-400">{lesson.type} lesson</p>

      {lesson.type !== "QUIZ" ? (
        <p className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
          {lesson.content || "No content added yet."}
        </p>
      ) : (
        <div className="mt-6">
          <Card title="Quiz questions">
            {lesson.quizQuestions.length === 0 ? (
              <p className="text-sm text-slate-400">No questions yet.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {lesson.quizQuestions.map((q, i) => (
                  <li key={q.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="text-slate-200">
                      {i + 1}. {q.prompt}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
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
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              {["A", "B", "C", "D"].map((key) => (
                <input
                  key={key}
                  type="text"
                  name={`option${key}`}
                  required
                  placeholder={`Option ${key}`}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                />
              ))}
              <div>
                <label className="block text-xs text-slate-400" htmlFor="correctOption">
                  Correct option
                </label>
                <select
                  id="correctOption"
                  name="correctOption"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
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
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
              >
                Add question
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
