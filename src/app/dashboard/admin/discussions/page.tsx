import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { createDiscussionReply, markDiscussionResolved } from "@/app/educom/discussion-actions";

export default async function AdminDiscussionsPage() {
  await requireAdminPagePermission("discussions.manage");

  const discussions = await prisma.discussion.findMany({
    where: { needsTutor: true, resolvedAt: null, course: { teacherId: null } },
    include: {
      author: { select: { name: true } },
      course: { select: { id: true, title: true } },
      replies: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Tutor escalations</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Tutor requests on courses with no assigned teacher — the fallback queue.
      </p>

      <div className="mt-6 space-y-4">
        {discussions.length === 0 ? (
          <Card title="Nothing waiting">
            <p className="text-sm text-text-secondary">No unclaimed tutor requests right now.</p>
          </Card>
        ) : (
          discussions.map((d) => (
            <Card key={d.id} title={d.title}>
              <p className="text-xs text-text-muted">
                {d.author.name} ·{" "}
                <Link href={`/educom/${d.course.id}`} className="hover:underline">
                  {d.course.title}
                </Link>{" "}
                · {new Date(d.createdAt).toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-text-secondary">{d.body}</p>

              {d.replies.length > 0 && (
                <ul className="mt-3 space-y-2 border-l border-border pl-3">
                  {d.replies.map((r) => (
                    <li key={r.id}>
                      <p className="text-xs text-text-muted">
                        {r.author.name} · {new Date(r.createdAt).toLocaleString()}
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
                  className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
                >
                  Reply
                </button>
              </form>
              <form action={markDiscussionResolved} className="mt-2">
                <input type="hidden" name="discussionId" value={d.id} />
                <button type="submit" className="text-xs text-text-secondary hover:text-success">
                  Mark resolved
                </button>
              </form>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
