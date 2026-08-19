import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { setSubmissionStatus, assignSubmission } from "@/app/dashboard/admin/support/actions";

const statusOptions = ["NEW", "IN_REVIEW", "RESPONDED", "RESOLVED", "CLOSED"] as const;

const statusColor: Record<string, string> = {
  NEW: "text-blue-400",
  IN_REVIEW: "text-amber-400",
  RESPONDED: "text-orange-400",
  RESOLVED: "text-green-400",
  CLOSED: "text-slate-500",
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
      <h1 className="text-2xl font-semibold">Support / Contact Messages</h1>
      <p className="mt-1 text-sm text-slate-400">
        {newCount} new submission{newCount === 1 ? "" : "s"} awaiting review.
      </p>

      <div className="mt-6">
        <Card title="Search">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, email, message…"
              className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <select
              name="status"
              defaultValue={status}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
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
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              Search
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 space-y-3">
        {submissions.length === 0 ? (
          <Card title="No submissions">
            <p className="text-sm text-slate-400">No contact messages match this filter.</p>
          </Card>
        ) : (
          submissions.map((s) => (
            <Card key={s.id} title={`${s.firstName} ${s.lastName}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {s.email}
                  {s.phone ? ` · ${s.phone}` : ""} · {s.accountType} · {s.topic}
                </span>
                <span>{new Date(s.createdAt).toLocaleString("en-NG")}</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{s.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`text-xs font-medium ${statusColor[s.status] ?? ""}`}>
                  {s.status}
                </span>
                {s.assignedTo && (
                  <span className="text-xs text-slate-500">· Assigned to {s.assignedTo.name}</span>
                )}
                <form action={setSubmissionStatus} className="ml-auto flex items-center gap-2">
                  <input type="hidden" name="submissionId" value={s.id} />
                  <select
                    name="status"
                    defaultValue={s.status}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-orange-500"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-500"
                  >
                    Update
                  </button>
                </form>
                <form action={assignSubmission}>
                  <input type="hidden" name="submissionId" value={s.id} />
                  <input type="hidden" name="assignToSelf" value={s.assignedToId ? "" : "on"} />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-500"
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
