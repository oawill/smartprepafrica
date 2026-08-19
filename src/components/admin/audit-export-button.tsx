"use client";

import { toCsv } from "@/lib/csv";
import { logAuditExport } from "@/app/dashboard/admin/security/audit-log/actions";

type Row = {
  when: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId: string;
  result: string;
  source: string;
};

export function AuditExportButton({ rows }: { rows: Row[] }) {
  async function handleExport() {
    await logAuditExport(rows.length);
    const csv = toCsv([
      ["when", "actor", "action", "resourceType", "resourceId", "result", "source"],
      ...rows.map((r) => [r.when, r.actor, r.action, r.resourceType, r.resourceId, r.result, r.source]),
    ]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="shrink-0 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
    >
      Export CSV
    </button>
  );
}
