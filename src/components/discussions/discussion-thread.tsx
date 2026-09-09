import { createDiscussion, createDiscussionReply, markDiscussionResolved } from "@/app/learn/discussion-actions";
import { Badge } from "@/components/ui/badge";

export type DiscussionThreadItem = {
  id: string;
  title: string;
  body: string;
  needsTutor: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
  author: { name: string | null };
  replies: {
    id: string;
    body: string;
    isTutorReply: boolean;
    createdAt: Date;
    author: { name: string | null };
  }[];
};

/** Shared public/peer-visible Q&A used on both the lesson page (scoped to
 * one lesson) and the course overview page (course-wide, lessonId null).
 * Also doubles as the "Ask a tutor" entry point via the needsTutor
 * checkbox in the composer — see discussion-actions.ts for why this isn't
 * a separate ticket model. */
export function DiscussionThread({
  discussions,
  courseId,
  lessonId,
  canResolve,
  askTutorDefaultChecked = false,
}: {
  discussions: DiscussionThreadItem[];
  courseId: string;
  lessonId?: string | null;
  canResolve: boolean;
  askTutorDefaultChecked?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface-raised p-4">
        <p className="text-sm font-medium text-text-primary">Ask a question</p>
        <form action={createDiscussion} className="mt-3 space-y-2">
          <input type="hidden" name="courseId" value={courseId} />
          {lessonId && <input type="hidden" name="lessonId" value={lessonId} />}
          <input
            name="title"
            required
            placeholder="What's your question about?"
            className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
          />
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Add any detail that would help someone answer."
            className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
          />
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              name="needsTutor"
              defaultChecked={askTutorDefaultChecked}
              className="accent-brand"
            />
            I&apos;d like a tutor to help me with this
          </label>
          <button
            type="submit"
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
          >
            Post question
          </button>
        </form>
      </div>

      {discussions.length === 0 ? (
        <p className="text-sm text-text-secondary">No questions here yet — be the first to ask.</p>
      ) : (
        discussions.map((d) => (
          <div key={d.id} className="rounded-lg border border-border bg-surface-raised p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-text-primary">{d.title}</p>
              {d.needsTutor && !d.resolvedAt && <Badge tone="warning">Awaiting a tutor</Badge>}
              {d.needsTutor && d.resolvedAt && <Badge tone="success">Resolved</Badge>}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {d.author.name} · {new Date(d.createdAt).toLocaleDateString()}
            </p>
            <p className="mt-2 text-sm text-text-secondary">{d.body}</p>

            {d.replies.length > 0 && (
              <ul className="mt-3 space-y-2 border-l border-border pl-3">
                {d.replies.map((r) => (
                  <li key={r.id}>
                    <p className="text-xs text-text-muted">
                      {r.author.name}
                      {r.isTutorReply && (
                        <span className="ml-1">
                          <Badge tone="brand">Tutor</Badge>
                        </span>
                      )}
                      {" · "}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-text-secondary">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}

            <form action={createDiscussionReply} className="mt-3 flex gap-2">
              <input type="hidden" name="discussionId" value={d.id} />
              <input
                name="body"
                required
                placeholder="Write a reply…"
                className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
              >
                Reply
              </button>
            </form>

            {canResolve && d.needsTutor && !d.resolvedAt && (
              <form action={markDiscussionResolved} className="mt-2">
                <input type="hidden" name="discussionId" value={d.id} />
                <button type="submit" className="text-xs text-text-secondary hover:text-success">
                  Mark resolved
                </button>
              </form>
            )}
          </div>
        ))
      )}
    </div>
  );
}
