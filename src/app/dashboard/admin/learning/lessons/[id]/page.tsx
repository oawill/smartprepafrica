import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { resolveVideoSource } from "@/lib/video/resolve-video-source";
import {
  approveLesson,
  sendLessonBackForChanges,
  publishLesson,
  archiveLesson,
  restoreLesson,
} from "@/app/dashboard/admin/learning/lessons/actions";

export default async function LessonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAdminPagePermission("lessons.view");
  const { id } = await params;
  const { error } = await searchParams;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      module: { select: { title: true, course: { select: { title: true, id: true } } } },
      courseTopic: { select: { title: true } },
      chapters: { orderBy: { order: "asc" }, include: { checkpoints: true } },
      quizQuestions: { where: { atSeconds: null }, orderBy: { order: "asc" } },
    },
  });
  if (!lesson) notFound();

  const adminRole = session.user.adminRole;
  const source = resolveVideoSource(lesson);
  const allCheckpoints = lesson.chapters.flatMap((c) => c.checkpoints);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {lesson.title} <span className="text-base font-normal text-text-muted">· {lesson.moderationStatus}</span>
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {lesson.module.course.title} · {lesson.module.title} · {lesson.type}
            {lesson.courseTopic && ` · ${lesson.courseTopic.title}`}
            {lesson.topic && ` · Practice topic: ${lesson.topic}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {["DRAFT", "SUBMITTED", "UNDER_REVIEW"].includes(lesson.moderationStatus) &&
            hasPermission(adminRole, "lessons.approve") && (
              <form action={approveLesson}>
                <input type="hidden" name="id" value={lesson.id} />
                <button type="submit" className="rounded-lg border border-success/40 px-3 py-2 text-xs text-success hover:border-success">
                  Approve
                </button>
              </form>
            )}
          {lesson.moderationStatus === "APPROVED" && hasPermission(adminRole, "lessons.publish") && (
            <form action={publishLesson}>
              <input type="hidden" name="id" value={lesson.id} />
              <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
                Publish
              </button>
            </form>
          )}
          {lesson.moderationStatus !== "SUSPENDED" && hasPermission(adminRole, "lessons.edit") && (
            <form action={archiveLesson}>
              <input type="hidden" name="id" value={lesson.id} />
              <button type="submit" className="rounded-lg border border-danger/40 px-3 py-2 text-xs text-danger hover:border-danger">
                Archive
              </button>
            </form>
          )}
          {lesson.moderationStatus === "SUSPENDED" && hasPermission(adminRole, "lessons.edit") && (
            <form action={restoreLesson}>
              <input type="hidden" name="id" value={lesson.id} />
              <button type="submit" className="rounded-lg border border-border-strong px-3 py-2 text-xs text-text-secondary hover:border-text-muted">
                Restore to draft
              </button>
            </form>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger-surface px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {lesson.moderationReason && (
        <div className="mt-4 rounded-lg border border-warning/40 bg-warning-surface px-4 py-3 text-sm text-warning">
          Reviewer note: {lesson.moderationReason}
        </div>
      )}

      {["SUBMITTED", "UNDER_REVIEW"].includes(lesson.moderationStatus) && hasPermission(adminRole, "lessons.approve") && (
        <div className="mt-6">
          <Card title="Send back for changes">
            <form action={sendLessonBackForChanges} className="flex gap-2">
              <input type="hidden" name="id" value={lesson.id} />
              <input
                name="reason"
                required
                placeholder="What needs to change?"
                className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-brand"
              />
              <button type="submit" className="shrink-0 rounded-lg border border-warning/40 px-4 py-2 text-sm text-warning hover:border-warning">
                Send back
              </button>
            </form>
          </Card>
        </div>
      )}

      {lesson.type === "VIDEO" && (
        <div className="mt-6">
          <Card title="Video preview">
            {source ? (
              <div>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption -- captionsUrl track is added conditionally below when present */}
                <video controls src={source.playbackUrl} poster={source.thumbnailUrl ?? undefined} className="w-full rounded-lg border border-border">
                  {source.captionsUrl && <track kind="captions" src={source.captionsUrl} default />}
                </video>
                <p className="mt-2 text-xs text-text-muted">
                  {lesson.durationSeconds ? `${Math.round(lesson.durationSeconds / 60)} min` : "Duration not set"}
                  {lesson.videoAttribution && ` · ${lesson.videoAttribution}`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted">No video URL set yet.</p>
            )}
          </Card>
        </div>
      )}

      {lesson.learningObjectives.length > 0 && (
        <div className="mt-6">
          <Card title="Learning objectives">
            <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
              {lesson.learningObjectives.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {lesson.chapters.length > 0 && (
        <div className="mt-6">
          <Card title={`Chapters (${lesson.chapters.length})`}>
            <div className="space-y-3">
              {lesson.chapters.map((c) => (
                <div key={c.id} className="rounded-lg border border-border px-4 py-3">
                  <p className="text-sm font-medium text-text-primary">
                    {Math.floor(c.startSeconds / 60)}:{String(c.startSeconds % 60).padStart(2, "0")} — {c.title}
                  </p>
                  {c.checkpoints.length > 0 && (
                    <ul className="mt-2 space-y-1 pl-4 text-xs text-text-secondary">
                      {c.checkpoints.map((cp) => (
                        <li key={cp.id}>
                          Checkpoint at {Math.floor((cp.atSeconds ?? 0) / 60)}:
                          {String((cp.atSeconds ?? 0) % 60).padStart(2, "0")}: {cp.prompt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {allCheckpoints.length === 0 && lesson.type === "VIDEO" && (
        <div className="mt-6">
          <Card title="Checkpoints">
            <p className="text-sm text-text-muted">No in-video checkpoints have been added yet.</p>
          </Card>
        </div>
      )}

      {lesson.quizQuestions.length > 0 && (
        <div className="mt-6">
          <Card title={`Quiz questions (${lesson.quizQuestions.length})`}>
            <ul className="space-y-1 text-sm text-text-secondary">
              {lesson.quizQuestions.map((q, i) => (
                <li key={q.id}>
                  {i + 1}. {q.prompt}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {lesson.notesMarkdown && (
        <div className="mt-6">
          <Card title="Notes">
            <pre className="whitespace-pre-wrap text-sm text-text-secondary">{lesson.notesMarkdown}</pre>
          </Card>
        </div>
      )}
    </div>
  );
}
