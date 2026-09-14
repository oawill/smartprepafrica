import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { createTask, updateTaskStatus } from "@/app/dashboard/admin/education-access/funding-center/tasks/actions";

const statusOptions = ["OPEN", "IN_PROGRESS", "WAITING", "COMPLETED"] as const;
const priorityOptions = ["HIGH", "MEDIUM", "LOW"] as const;

const STATUS_TONE: Record<string, BadgeTone> = {
  OPEN: "neutral",
  IN_PROGRESS: "info",
  WAITING: "warning",
  COMPLETED: "success",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

export default async function FundingCenterTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminPagePermission("funding_center.view");
  const { status } = await searchParams;

  const [tasks, opportunities] = await Promise.all([
    prisma.educationAccessTask.findMany({
      where: status ? { status } : undefined,
      include: { opportunity: { select: { opportunityName: true } }, owner: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    prisma.educationAccessFundingOpportunity.findMany({ select: { id: true, opportunityName: true }, orderBy: { opportunityName: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Tasks</h1>
      <p className="mt-1 text-sm text-text-secondary">Follow-ups and to-dos for the grant pipeline.</p>

      <div className="mt-6">
        <Card title="Filter">
          <form className="flex gap-2">
            <select name="status" defaultValue={status} className={inputClass + " sm:w-auto"}>
              <option value="">Any status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted">
              Filter
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 space-y-2">
        {tasks.length === 0 ? (
          <Card title="No tasks"><p className="text-sm text-text-secondary">Add one below.</p></Card>
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-raised p-4">
              <div>
                <p className="text-text-primary">{t.task}</p>
                <p className="text-xs text-text-muted">
                  {t.opportunity ? `${t.opportunity.opportunityName} · ` : ""}
                  {t.owner ? `${t.owner.name} · ` : ""}
                  {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-US") : "No due date"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[t.status] ?? "neutral"}>{t.status.replaceAll("_", " ")}</Badge>
                <form action={updateTaskStatus} className="flex items-center gap-2">
                  <input type="hidden" name="taskId" value={t.id} />
                  <select name="status" defaultValue={t.status} className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand">
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-lg border border-border-strong px-2 py-1 text-xs text-text-secondary hover:border-text-muted">
                    Update
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6">
        <Card title="Add a task">
          <form action={createTask} className="space-y-2">
            <input name="task" required placeholder="Task" className={inputClass} />
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Opportunity (optional)</label>
                <select name="opportunityId" className={inputClass}>
                  <option value="">None</option>
                  {opportunities.map((o) => (
                    <option key={o.id} value={o.id}>{o.opportunityName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Due date</label>
                <input name="dueDate" type="date" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select name="priority" defaultValue="MEDIUM" className={inputClass}>
                  {priorityOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <textarea name="notes" placeholder="Notes" rows={2} className={inputClass} />
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
              Add Task
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
