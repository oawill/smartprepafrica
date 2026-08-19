import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { hasPermission } from "@/lib/admin/permissions";
import { AuditExportButton } from "@/components/admin/audit-export-button";

type MergedEntry = {
  id: string;
  source: "AuditLog" | "Partner";
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: string;
  actorUserId: string | null;
  createdAt: Date;
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; resourceType?: string }>;
}) {
  const session = await requireAdminPagePermission("audit.view");
  const { action, resourceType } = await searchParams;

  const [generalLogs, partnerLogs, actors] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
        ...(resourceType ? { resourceType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.partnerAuditLog.findMany({
      where: {
        ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
        ...(resourceType ? { entityType: resourceType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  const merged: MergedEntry[] = [
    ...generalLogs.map((l) => ({
      id: l.id,
      source: "AuditLog" as const,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      result: l.result,
      actorUserId: l.actorUserId,
      createdAt: l.createdAt,
    })),
    ...partnerLogs.map((l) => ({
      id: l.id,
      source: "Partner" as const,
      action: l.action,
      resourceType: l.entityType,
      resourceId: l.entityId,
      result: "SUCCESS",
      actorUserId: l.actorUserId,
      createdAt: l.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 200);

  const nameById = new Map(actors.map((a) => [a.id, a.name]));
  const canExport = hasPermission(session.user.adminRole, "audit.export");

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Audit log</h1>
          <p className="mt-1 text-sm text-slate-400">
            Every sensitive administrative action, merged from the general and Partner-program audit trails.
            Never editable or deletable from this screen.
          </p>
        </div>
        {canExport && (
          <AuditExportButton
            rows={merged.map((m) => ({
              when: m.createdAt.toISOString(),
              actor: nameById.get(m.actorUserId ?? "") ?? "System",
              action: m.action,
              resourceType: m.resourceType,
              resourceId: m.resourceId ?? "",
              result: m.result,
              source: m.source,
            }))}
          />
        )}
      </div>

      <div className="mt-6">
        <Card title="Filter">
          <form className="flex gap-2">
            <input
              name="action"
              defaultValue={action}
              placeholder="Filter by action…"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="resourceType"
              defaultValue={resourceType}
              placeholder="Resource type (e.g. Question)…"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button type="submit" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500">
              Filter
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`${merged.length} most recent`}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="pb-2">When</th>
                <th className="pb-2">Actor</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Resource</th>
                <th className="pb-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {merged.map((m) => (
                <tr key={`${m.source}-${m.id}`} className="border-t border-slate-800">
                  <td className="py-2 text-slate-500">{m.createdAt.toLocaleString("en-NG")}</td>
                  <td className="py-2 text-slate-300">{nameById.get(m.actorUserId ?? "") ?? "System"}</td>
                  <td className="py-2 text-slate-300">{m.action}</td>
                  <td className="py-2 text-slate-400">
                    {m.resourceType}
                    {m.resourceId && <span className="ml-1 font-mono text-xs text-slate-600">{m.resourceId.slice(0, 10)}</span>}
                  </td>
                  <td
                    className={`py-2 ${
                      m.result === "DENIED" || m.result === "FAILURE" ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {m.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
