import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrollInCourse, submitAssignment, submitCourseReview } from "@/app/educom/actions";
import { formatNaira } from "@/lib/plans";
import { getCourseRating, formatRating } from "@/lib/ratings";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";

export default async function CourseDetailPage({
  params,
}: PageProps<"/educom/[courseId]">) {
  const { courseId } = await params;
  const session = await auth();

  const course = await prisma.course.findUnique({
    where: { id: courseId, published: true },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
      assignments: {
        orderBy: { createdAt: "asc" },
        include: {
          submissions: session
            ? { where: { userId: session.user.id } }
            : false,
        },
      },
      school: { select: { id: true, name: true, state: true } },
      teacher: { select: { id: true, user: { select: { name: true } } } },
      reviews: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      liveClasses: {
        where: { scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) notFound();

  const rating = await getCourseRating(course.id);
  const myReview = session ? course.reviews.find((r) => r.userId === session.user.id) : undefined;

  const isPaid = !!course.priceKobo && course.priceKobo > 0;

  const totalLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );

  const enrollment = session
    ? await prisma.courseEnrollment.findUnique({
        where: {
          userId_courseId: { userId: session.user.id, courseId },
        },
        include: { lessonProgress: true },
      })
    : null;

  const completedLessonIds = new Set(
    (enrollment?.lessonProgress ?? [])
      .filter((p) => p.completedAt)
      .map((p) => p.lessonId)
  );
  const progressPct =
    totalLessons > 0
      ? Math.round((completedLessonIds.size / totalLessons) * 100)
      : 0;

  const firstLesson = course.modules[0]?.lessons[0];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/educom" className="text-sm text-slate-400 hover:text-white">
        ← Back to Courses
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <span className="inline-block rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
          {course.category.replace(/_/g, " ")}
        </span>
        {enrollment && (
          <AiCoachPanel
            context={{ courseId: course.id }}
            suggestedPrompts={[
              "What should I know before starting this course?",
              "Quiz me on this course so far",
              "What should I study today?",
              "Check my exam readiness",
            ]}
          />
        )}
      </div>
      <h1 className="mt-3 text-3xl font-semibold">{course.title}</h1>

      {course.school && (
        <p className="mt-2 text-sm text-slate-400">
          Offered by{" "}
          <Link href={`/educom/schools/${course.school.id}`} className="text-orange-400 hover:underline">
            {course.school.name}
          </Link>
          {course.school.state && ` — ${course.school.state}`}
        </p>
      )}

      <p className="mt-2 text-slate-400">{course.description}</p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
        {course.teacher ? (
          <span>
            Taught by{" "}
            <Link href={`/educom/teachers/${course.teacher.id}`} className="text-orange-400 hover:underline">
              {course.teacher.user.name}
            </Link>
          </span>
        ) : (
          course.instructorName && <span>Taught by {course.instructorName}</span>
        )}
        {course.difficulty && <span>{course.difficulty}</span>}
        {course.estimatedMinutes && <span>{course.estimatedMinutes} min</span>}
        <span>
          {course._count.enrollments} learner{course._count.enrollments === 1 ? "" : "s"}
        </span>
        <span>{formatRating(rating)}</span>
        <span>{isPaid ? formatNaira(course.priceKobo!) : "Free"}</span>
      </div>

      {course.learningObjectives.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            What you&apos;ll learn
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {course.learningObjectives.map((objective) => (
              <li key={objective}>· {objective}</li>
            ))}
          </ul>
        </div>
      )}

      {enrollment ? (
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              {completedLessonIds.size} / {totalLessons} lessons complete
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-green-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {enrollment.status === "COMPLETED" && (
            <p className="mt-3 rounded-lg border border-green-800 bg-green-900/30 px-4 py-2 text-sm text-green-300">
              Course complete — your certificate has been issued.
            </p>
          )}
          {firstLesson && (
            <Link
              href={`/educom/${course.id}/lessons/${firstLesson.id}`}
              className="mt-4 inline-block rounded-full bg-orange-500 px-6 py-2.5 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              {completedLessonIds.size > 0 ? "Continue course" : "Start course"}
            </Link>
          )}
        </div>
      ) : isPaid ? (
        <p className="mt-6 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
          Paid course checkout isn&apos;t available yet — pricing is shown for
          browsing only.
        </p>
      ) : (
        <form action={enrollInCourse.bind(null, course.id)} className="mt-6">
          <button
            type="submit"
            className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-medium text-slate-950 hover:bg-orange-400"
          >
            Enroll for free
          </button>
        </form>
      )}

      <div className="mt-10 space-y-6">
        {course.modules.map((mod, i) => (
          <div key={mod.id}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Module {i + 1}
            </p>
            <h2 className="mt-1 font-medium">{mod.title}</h2>
            <ul className="mt-2 space-y-1">
              {mod.lessons.map((lesson) => {
                const isComplete = completedLessonIds.has(lesson.id);
                const content = (
                  <span className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm">
                    <span className={isComplete ? "text-slate-400" : "text-slate-200"}>
                      {lesson.title}
                    </span>
                    {isComplete && <span className="text-green-400">✓</span>}
                  </span>
                );
                return (
                  <li key={lesson.id}>
                    {enrollment ? (
                      <Link href={`/educom/${course.id}/lessons/${lesson.id}`}>
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {enrollment && course.assignments.length > 0 && (
        <div className="mt-10 space-y-4 border-t border-slate-800 pt-8">
          <h2 className="text-lg font-semibold">Assignments</h2>
          {course.assignments.map((assignment) => {
            const submission = assignment.submissions?.[0];
            return (
              <div key={assignment.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-100">{assignment.title}</p>
                  {assignment.dueAt && (
                    <p className="text-xs text-slate-500">
                      Due {assignment.dueAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-400">{assignment.instructions}</p>

                {submission ? (
                  <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm">
                    <p className="text-xs text-slate-500">
                      Submitted {submission.submittedAt.toLocaleDateString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-300">{submission.content}</p>
                    {submission.gradedAt ? (
                      <p className="mt-2 text-green-400">
                        Grade: {submission.grade}%
                        {submission.feedback && ` — ${submission.feedback}`}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-amber-400">Awaiting grading.</p>
                    )}
                  </div>
                ) : (
                  <form action={submitAssignment.bind(null, assignment.id)} className="mt-3 space-y-2">
                    <textarea
                      name="content"
                      required
                      rows={3}
                      placeholder="Write your response…"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
                    >
                      Submit
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {course.liveClasses.length > 0 && (
        <div className="mt-10 border-t border-slate-800 pt-8">
          <h2 className="text-lg font-semibold">Upcoming live classes</h2>
          <ul className="mt-3 space-y-2">
            {course.liveClasses.map((lc) => (
              <li key={lc.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">
                <p className="text-slate-100">{lc.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {lc.scheduledAt.toLocaleString()} · {lc.durationMinutes} min
                </p>
                {enrollment && (
                  <a
                    href={lc.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-orange-400 hover:underline"
                  >
                    Join link →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 border-t border-slate-800 pt-8">
        <h2 className="text-lg font-semibold">Reviews</h2>
        {course.reviews.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No reviews yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {course.reviews.map((review) => (
              <li key={review.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-slate-100">{review.user.name}</p>
                  <p className="text-orange-400">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                </div>
                {review.comment && <p className="mt-1 text-slate-400">{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}

        {enrollment?.status === "COMPLETED" && (
          <form action={submitCourseReview.bind(null, course.id)} className="mt-4 space-y-2">
            <label className="block text-xs text-slate-400">
              {myReview ? "Update your review" : "Leave a review"}
            </label>
            <select
              name="rating"
              defaultValue={myReview?.rating ?? 5}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? "" : "s"}
                </option>
              ))}
            </select>
            <textarea
              name="comment"
              defaultValue={myReview?.comment ?? ""}
              rows={2}
              placeholder="What was your experience with this course?"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              {myReview ? "Update review" : "Submit review"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
