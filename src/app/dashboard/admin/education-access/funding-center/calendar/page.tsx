import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { deadlineUrgency } from "@/lib/education-access/funding-center/scoring";
import { DeadlineBadge } from "@/components/education-access/funding-center/badges";

type CalendarEntry = {
  id: string;
  date: Date;
  label: string;
  type: "Deadline" | "Task" | "Follow-up";
  href: string;
};

export default async function FundingCenterCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ priority?: string; funderId?: string; status?: string }>;
}) {
  await requireAdminPagePermission("funding_center.view");
  const params = await searchParams;

  const [opportunities, tasks, outreach, funders] = await Promise.all([
    prisma.educationAccessFundingOpportunity.findMany({
      where: {
        deadline: { not: null },
        ...(params.priority ? { priority: params.priority as never } : {}),
        ...(params.funderId ? { funderId: params.funderId } : {}),
        ...(params.status ? { status: params.status as never } : {}),
      },
      include: { funder: { select: { organizationName: true } } },
    }),
    prisma.educationAccessTask.findMany({
      where: { dueDate: { not: null }, status: { not: "COMPLETED" } },
      include: { opportunity: { select: { opportunityName: true } } },
    }),
    prisma.educationAccessOutreach.findMany({
      where: { followUpDate: { not: null } },
      include: { funder: { select: { organizationName: true } } },
    }),
    prisma.educationAccessFunder.findMany({ select: { id: true, organizationName: true }, orderBy: { organizationName: "asc" } }),
  ]);

  const entries: CalendarEntry[] = [
    ...opportunities.map((o) => ({
      id: o.id,
      date: o.deadline as Date,
      label: `${o.opportunityName} (${o.funder.organizationName}) — deadline`,
      type: "Deadline" as const,
      href: `/dashboard/admin/education-access/funding-center/opportunities/${o.id}`,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      date: t.dueDate as Date,
      label: `${t.task}${t.opportunity ? ` (${t.opportunity.opportunityName})` : ""} — task due`,
      type: "Task" as const,
      href: "/dashboard/admin/education-access/funding-center/tasks",
    })),
    ...outreach.map((o) => ({
      id: o.id,
      date: o.followUpDate as Date,
      label: `Follow up with ${o.funder.organizationName}`,
      type: "Follow-up" as const,
      href: `/dashboard/admin/education-access/funding-center/funders/${o.funderId}`,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const now = new Date();
  const overdue = entries.filter((e) => e.date < now);
  const upcoming = entries.filter((e) => e.date >= now);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Grant Calendar</h1>
      <p className="mt-1 text-sm text-text-secondary">LOI/application deadlines, task due dates, and outreach follow-ups in one timeline.</p>

      <div className="mt-6">
        <Card title="Filter">
          <form className="flex flex-wrap gap-2">
            <select name="priority" defaultValue={params.priority} className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand">
              <option value="">Any priority</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select name="funderId" defaultValue={params.funderId} className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand">
              <option value="">Any funder</option>
              {funders.map((f) => (
                <option key={f.id} value={f.id}>{f.organizationName}</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted">
              Filter
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title={`Overdue (${overdue.length})`}>
          {overdue.length === 0 ? (
            <p className="text-sm text-text-secondary">Nothing overdue.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {overdue.map((e) => (
                <li key={`${e.type}-${e.id}`} className="flex items-center justify-between gap-2">
                  <Link href={e.href} className="text-text-primary hover:underline">{e.label}</Link>
                  <span className="text-xs text-danger">{e.date.toLocaleDateString("en-US")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Upcoming (${upcoming.length})`}>
          {upcoming.length === 0 ? (
            <p className="text-sm text-text-secondary">Nothing upcoming.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((e) => (
                <li key={`${e.type}-${e.id}`} className="flex items-center justify-between gap-2">
                  <Link href={e.href} className="text-text-primary hover:underline">{e.label}</Link>
                  <span className="flex items-center gap-2 text-xs text-text-muted">
                    {e.date.toLocaleDateString("en-US")}
                    {e.type === "Deadline" && <DeadlineBadge urgency={deadlineUrgency(e.date)} />}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
