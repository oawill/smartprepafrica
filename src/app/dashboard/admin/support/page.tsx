import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { setSubmissionStatus, assignSubmission } from "@/app/dashboard/admin/support/actions";

const statusOptions = ["NEW", "IN_REVIEW", "RESPONDED", "RESOLVED", "CLOSED"] as const;

const STATUS_TONE: Record<string, BadgeTone> = {
  NEW: "warning",
  IN_REVIEW: "warning",
  RESPONDED: "info",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; topic?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const q = params.q?.trim();
  const status = params.status;
  const topic = params.topic;

  const submissions = await prisma.contactSubmission.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(topic ? { topic: topic as never } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { message: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { assignedTo: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const newCount = await prisma.contactSubmission.count({ where: { status: "NEW" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Support / Contact Messages</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {newCount} new submission{newCount === 1 ? "" : "s"} awaiting review.
      </p>

      <div className="mt-6">
        <Card title="Search">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, email, message…"
              className="flex-1 min-w-[200px] rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <select
              name="status"
              defaultValue={status}
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              <option value="">Any status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Search
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 space-y-3">
        {submissions.length === 0 ? (
          <Card title="No submissions">
            <p className="text-sm text-text-secondary">No contact messages match this filter.</p>
          </Card>
        ) : (
          submissions.map((s) => (
            <Card key={s.id} title={`${s.firstName} ${s.lastName}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                <span>
                  {s.email}
                  {s.phone ? ` · ${s.phone}` : ""} · {s.accountType} · {s.topic}
                </span>
                <span>{new Date(s.createdAt).toLocaleString("en-NG")}</span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{s.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status}</Badge>
                {s.assignedTo && (
                  <span className="text-xs text-text-muted">· Assigned to {s.assignedTo.name}</span>
                )}
                <form action={setSubmissionStatus} className="ml-auto flex items-center gap-2">
                  <input type="hidden" name="submissionId" value={s.id} />
                  <select
                    name="status"
                    defaultValue={s.status}
                    className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-text-muted"
                  >
                    Update
                  </button>
                </form>
                <form action={assignSubmission}>
                  <input type="hidden" name="submissionId" value={s.id} />
                  <input type="hidden" name="assignToSelf" value={s.assignedToId ? "" : "on"} />
                  <button
                    type="submit"
                    className="rounded-lg border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-text-muted"
                  >
                    {s.assignedToId ? "Unassign" : "Assign to me"}
                  </button>
                </form>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
