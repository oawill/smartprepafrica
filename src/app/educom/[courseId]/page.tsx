import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrollInCourse, submitAssignment, submitCourseReview } from "@/app/educom/actions";
import { getCourseRating, formatRating } from "@/lib/ratings";
import { getUserPlan } from "@/lib/ai/limits";
import { canEnrollInCourse } from "@/lib/learning/course-access";
import { AiCoachPanel } from "@/components/ai-coach/coach-panel";
import { CheckIcon } from "@/components/ui/icons";

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

  const plan = session ? await getUserPlan(session.user.id) : "FREE";
  const canEnroll = canEnrollInCourse(plan, course.requiresSubscription);

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
      <Link href="/educom" className="text-sm text-text-secondary hover:text-text-primary">
        ← Back to Courses
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <span className="inline-block rounded-full border border-border-strong px-3 py-1 text-xs text-text-secondary">
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
      <h1 className="mt-3 text-h1 font-semibold text-text-primary">{course.title}</h1>

      {course.school && (
        <p className="mt-2 text-sm text-text-secondary">
          Offered by{" "}
          <Link href={`/educom/schools/${course.school.id}`} className="text-brand-text hover:underline">
            {course.school.name}
          </Link>
          {course.school.state && ` — ${course.school.state}`}
        </p>
      )}

      <p className="mt-2 text-text-secondary">{course.description}</p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
        {course.teacher ? (
          <span>
            Taught by{" "}
            <Link href={`/educom/teachers/${course.teacher.id}`} className="text-brand-text hover:underline">
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
        <span>{course.requiresSubscription ? "Included with subscription" : "Free"}</span>
      </div>

      {course.learningObjectives.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-surface-raised p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            What you&apos;ll learn
          </p>
          <ul className="mt-2 space-y-1 text-sm text-text-secondary">
            {course.learningObjectives.map((objective) => (
              <li key={objective}>· {objective}</li>
            ))}
          </ul>
        </div>
      )}

      {enrollment ? (
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>
              {completedLessonIds.size} / {totalLessons} lessons complete
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full bg-success"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {enrollment.status === "COMPLETED" && (
            <p className="mt-3 rounded-lg border border-success/40 bg-success-surface px-4 py-2 text-sm text-success">
              Course complete — your certificate has been issued.
            </p>
          )}
          {firstLesson && (
            <Link
              href={`/educom/${course.id}/lessons/${firstLesson.id}`}
              className="mt-4 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              {completedLessonIds.size > 0 ? "Continue course" : "Start course"}
            </Link>
          )}
        </div>
      ) : !canEnroll ? (
        <div className="mt-6 rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm text-text-secondary">
          <p>Included with Basic, Premium, and Pro.</p>
          <Link href="/pricing" className="mt-2 inline-block font-medium text-brand-text hover:underline">
            View Plans & Pricing →
          </Link>
        </div>
      ) : (
        <form action={enrollInCourse.bind(null, course.id)} className="mt-6">
          <button
            type="submit"
            className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            {course.requiresSubscription ? "Enroll" : "Enroll for free"}
          </button>
        </form>
      )}

      <div className="mt-10 space-y-6">
        {course.modules.map((mod, i) => (
          <div key={mod.id}>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Module {i + 1}
            </p>
            <h2 className="mt-1 font-medium text-text-primary">{mod.title}</h2>
            <ul className="mt-2 space-y-1">
              {mod.lessons.map((lesson) => {
                const isComplete = completedLessonIds.has(lesson.id);
                const content = (
                  <span className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm">
                    <span className={isComplete ? "text-text-secondary" : "text-text-primary"}>
                      {lesson.title}
                    </span>
                    {isComplete && (
                      <span className="flex items-center gap-1 text-xs font-medium text-success">
                        <CheckIcon className="h-3.5 w-3.5" /> Completed
                      </span>
                    )}
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
        <div className="mt-10 space-y-4 border-t border-border pt-8">
          <h2 className="text-lg font-semibold text-text-primary">Assignments</h2>
          {course.assignments.map((assignment) => {
            const submission = assignment.submissions?.[0];
            return (
              <div key={assignment.id} className="rounded-xl border border-border bg-surface-raised p-5">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-text-primary">{assignment.title}</p>
                  {assignment.dueAt && (
                    <p className="text-xs text-text-muted">
                      Due {assignment.dueAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
                <p className="mt-1 text-sm text-text-secondary">{assignment.instructions}</p>

                {submission ? (
                  <div className="mt-3 rounded-lg border border-border bg-surface p-3 text-sm">
                    <p className="text-xs text-text-muted">
                      Submitted {submission.submittedAt.toLocaleDateString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-text-secondary">{submission.content}</p>
                    {submission.gradedAt ? (
                      <p className="mt-2 text-success">
                        Grade: {submission.grade}%
                        {submission.feedback && ` — ${submission.feedback}`}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-warning">Awaiting grading.</p>
                    )}
                  </div>
                ) : (
                  <form action={submitAssignment.bind(null, assignment.id)} className="mt-3 space-y-2">
                    <textarea
                      name="content"
                      required
                      rows={3}
                      placeholder="Write your response…"
                      className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
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
        <div className="mt-10 border-t border-border pt-8">
          <h2 className="text-lg font-semibold text-text-primary">Upcoming live classes</h2>
          <ul className="mt-3 space-y-2">
            {course.liveClasses.map((lc) => (
              <li key={lc.id} className="rounded-lg border border-border bg-surface-raised p-4 text-sm">
                <p className="text-text-primary">{lc.title}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {lc.scheduledAt.toLocaleString()} · {lc.durationMinutes} min
                </p>
                {enrollment && (
                  <a
                    href={lc.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-brand-text hover:underline"
                  >
                    Join link →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-text-primary">Reviews</h2>
        {course.reviews.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">No reviews yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {course.reviews.map((review) => (
              <li key={review.id} className="rounded-lg border border-border bg-surface-raised p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-text-primary">{review.user.name}</p>
                  <p className="text-brand-text">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                </div>
                {review.comment && <p className="mt-1 text-text-secondary">{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}

        {enrollment?.status === "COMPLETED" && (
          <form action={submitCourseReview.bind(null, course.id)} className="mt-4 space-y-2">
            <label className="block text-xs text-text-secondary">
              {myReview ? "Update your review" : "Leave a review"}
            </label>
            <select
              name="rating"
              defaultValue={myReview?.rating ?? 5}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
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
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              {myReview ? "Update review" : "Submit review"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
