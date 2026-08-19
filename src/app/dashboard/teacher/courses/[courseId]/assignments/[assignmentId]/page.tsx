import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeSubmission } from "@/app/dashboard/teacher/courses/actions";

export default async function AssignmentSubmissionsPage({
  params,
}: PageProps<"/dashboard/teacher/courses/[courseId]/assignments/[assignmentId]">) {
  const { courseId, assignmentId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const teacher = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) redirect("/dashboard");

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      course: true,
      submissions: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { submittedAt: "desc" },
      },
    },
  });
  if (!assignment || assignment.courseId !== courseId || assignment.course.teacherId !== teacher.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/dashboard/teacher/courses/${courseId}`}
        className="text-sm text-slate-400 hover:text-white"
      >
        ← {assignment.course.title}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">{assignment.title}</h1>
      <p className="mt-1 text-sm text-slate-400">{assignment.instructions}</p>

      <div className="mt-8 space-y-4">
        {assignment.submissions.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
            No submissions yet.
          </p>
        ) : (
          assignment.submissions.map((sub) => (
            <div key={sub.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-100">{sub.user.name}</p>
                <p className="text-xs text-slate-500">
                  Submitted {sub.submittedAt.toLocaleDateString()}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{sub.content}</p>

              {sub.gradedAt ? (
                <div className="mt-3 rounded-lg border border-green-800 bg-green-900/30 px-3 py-2 text-sm text-green-300">
                  Grade: {sub.grade}% {sub.feedback && `— ${sub.feedback}`}
                </div>
              ) : (
                <form action={gradeSubmission} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="submissionId" value={sub.id} />
                  <div>
                    <label className="block text-xs text-slate-400">Grade (%)</label>
                    <input
                      type="number"
                      name="grade"
                      min={0}
                      max={100}
                      required
                      className="mt-1 w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs text-slate-400">Feedback</label>
                    <input
                      type="text"
                      name="feedback"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
                  >
                    Save grade
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
