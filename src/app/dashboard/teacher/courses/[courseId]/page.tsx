import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import {
  createModule,
  createLesson,
  createAssignment,
  submitCourseForReview,
  createCourseTopic,
  scheduleLiveClass,
} from "@/app/dashboard/teacher/courses/actions";

const MODERATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft — not submitted for review yet",
  SUBMITTED: "Submitted — waiting for an admin to review",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved — waiting to be published",
  PUBLISHED: "Published — live in the course catalog",
  REJECTED: "Rejected",
  NEEDS_CHANGES: "Changes requested — see the note below",
  SUSPENDED: "Suspended by an administrator",
};

export default async function ManageCoursePage({
  params,
}: PageProps<"/dashboard/teacher/courses/[courseId]">) {
  const { courseId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const teacher = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) redirect("/dashboard");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
      courseTopics: { orderBy: { order: "asc" } },
      assignments: { orderBy: { createdAt: "desc" } },
      liveClasses: { orderBy: { scheduledAt: "asc" } },
      classLevel: { select: { name: true } },
    },
  });
  if (!course || course.teacherId !== teacher.id) notFound();

  const canSubmitForReview = course.moderationStatus === "DRAFT" || course.moderationStatus === "NEEDS_CHANGES";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard/teacher" className="text-sm text-slate-400 hover:text-white">
        ← Teacher dashboard
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <p className="mt-1 text-sm text-slate-400">{course.description}</p>
          {course.classLevel && <p className="mt-1 text-xs text-slate-500">{course.classLevel.name}</p>}
        </div>
        {canSubmitForReview && (
          <form action={submitCourseForReview}>
            <input type="hidden" name="courseId" value={course.id} />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-orange-500 px-4 py-2 text-xs font-medium text-slate-950 hover:bg-orange-400"
            >
              Submit for review
            </button>
          </form>
        )}
      </div>
      <p className="mt-2 text-xs text-amber-400">
        {MODERATION_STATUS_LABELS[course.moderationStatus] ?? course.moderationStatus}
      </p>
      {course.moderationReason && (
        <p className="mt-1 text-xs text-slate-400">Reviewer note: {course.moderationReason}</p>
      )}

      <div className="mt-8 space-y-6">
        <Card title="Topics">
          {course.courseTopics.length === 0 ? (
            <p className="text-sm text-slate-400">
              No topics yet — group lessons under a topic like &quot;Acids, Bases &amp; Salts&quot; so
              students can browse by unit.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm text-slate-300">
              {course.courseTopics.map((t) => (
                <li key={t.id}>{t.title}</li>
              ))}
            </ul>
          )}
          <form action={createCourseTopic} className="mt-3 flex gap-2">
            <input type="hidden" name="courseId" value={course.id} />
            <input
              type="text"
              name="title"
              required
              placeholder="New topic title"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              Add topic
            </button>
          </form>
        </Card>

        {course.modules.map((mod, i) => (
          <Card key={mod.id} title={`Module ${i + 1}: ${mod.title}`}>
            {mod.lessons.length === 0 ? (
              <p className="text-sm text-slate-400">No lessons yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {mod.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`/dashboard/teacher/courses/${course.id}/lessons/${lesson.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm hover:border-slate-600"
                    >
                      <span>{lesson.title}</span>
                      <span className="text-xs text-slate-500">{lesson.type}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <form action={createLesson} className="mt-3 space-y-2">
              <input type="hidden" name="moduleId" value={mod.id} />
              <div className="flex gap-2">
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="New lesson title"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                />
                <select
                  name="type"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                >
                  <option value="TEXT">Text</option>
                  <option value="VIDEO">Video</option>
                  <option value="QUIZ">Quiz</option>
                </select>
              </div>
              <textarea
                name="content"
                placeholder="Lesson content (or quiz intro text)"
                rows={2}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              <input
                type="url"
                name="videoUrl"
                placeholder="Video URL (if video lesson)"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  name="durationSeconds"
                  placeholder="Video duration (seconds)"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                />
                <select
                  name="courseTopicId"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
                >
                  <option value="">No topic (ungrouped)</option>
                  {course.courseTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="url"
                name="thumbnailUrl"
                placeholder="Thumbnail URL (optional)"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              <input
                type="text"
                name="videoAttribution"
                placeholder="Video attribution — e.g. &quot;Title — Author, License&quot; (for sourced clips)"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              <textarea
                name="learningObjectives"
                placeholder="Learning objectives, one per line"
                rows={2}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              <textarea
                name="notesMarkdown"
                placeholder="Lesson notes (key concepts, formulas, examples — shown in the Notes tab)"
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              <textarea
                name="transcriptFull"
                placeholder="Full transcript (optional fallback — prefer per-chapter transcripts once chapters are added)"
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              <input
                type="text"
                name="topic"
                placeholder="Practice topic (optional — links to SmartPrepAfrica questions)"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
              >
                Add lesson
              </button>
            </form>
          </Card>
        ))}

        <Card title="Add a module">
          <form action={createModule} className="flex gap-2">
            <input type="hidden" name="courseId" value={course.id} />
            <input
              type="text"
              name="title"
              required
              placeholder="Module title"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Add
            </button>
          </form>
        </Card>

        <Card title="Assignments">
          {course.assignments.length === 0 ? (
            <p className="text-sm text-slate-400">No assignments yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {course.assignments.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/dashboard/teacher/courses/${course.id}/assignments/${a.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm hover:border-slate-600"
                  >
                    <span>{a.title}</span>
                    <span className="text-xs text-slate-500">
                      {a.dueAt ? `Due ${a.dueAt.toLocaleDateString()}` : "No due date"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <form action={createAssignment} className="mt-3 space-y-2">
            <input type="hidden" name="courseId" value={course.id} />
            <input
              type="text"
              name="title"
              required
              placeholder="Assignment title"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <textarea
              name="instructions"
              required
              placeholder="Instructions"
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              type="date"
              name="dueAt"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Add assignment
            </button>
          </form>
        </Card>

        <Card title="Live classes">
          {course.liveClasses.length === 0 ? (
            <p className="text-sm text-slate-400">No live classes scheduled yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {course.liveClasses.map((lc) => (
                <li
                  key={lc.id}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                >
                  <p className="text-slate-100">{lc.title}</p>
                  <p className="text-xs text-slate-500">
                    {lc.scheduledAt.toLocaleString()} · {lc.durationMinutes} min
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form action={scheduleLiveClass} className="mt-3 space-y-2">
            <input type="hidden" name="courseId" value={course.id} />
            <input
              type="text"
              name="title"
              required
              placeholder="Live class title"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                name="scheduledAt"
                required
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              <input
                type="number"
                name="durationMinutes"
                min={5}
                required
                placeholder="Minutes"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <input
              type="url"
              name="meetingUrl"
              required
              placeholder="Meeting link (Zoom, Google Meet, etc.)"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Schedule live class
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
