"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { BulkResultBanner } from "@/components/admin/bulk-result-banner";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { bulkSuspendUsers, bulkReactivateUsers } from "@/app/dashboard/admin/users/actions";
import type { BulkAction, BulkResult } from "@/lib/admin/bulk-types";

const STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "success",
  SUSPENDED: "danger",
  LOCKED: "danger",
  PENDING_VERIFICATION: "warning",
  CLOSED: "neutral",
};

export type BulkUserRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  studentNumber: string | null;
  detail: string;
};

export function UserBulkTable({
  users,
  roleSlug,
  canBulkUpdate,
}: {
  users: BulkUserRow[];
  roleSlug: string;
  canBulkUpdate: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ result: BulkResult; label: string } | null>(null);

  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) return new Set();
      return new Set(users.map((u) => u.id));
    });
  }

  const actions: BulkAction[] = [
    {
      key: "suspend",
      label: "Suspend selected",
      danger: true,
      needsReason: true,
      confirmMessage: (n) => `You are about to suspend ${n} record${n === 1 ? "" : "s"}. Continue?`,
      run: (ids, reason) => bulkSuspendUsers(ids, reason),
    },
    {
      key: "reactivate",
      label: "Reactivate selected",
      confirmMessage: (n) => `You are about to reactivate ${n} record${n === 1 ? "" : "s"}. Continue?`,
      run: (ids) => bulkReactivateUsers(ids),
    },
  ];

  return (
    <div>
      {result && (
        <BulkResultBanner result={result.result} onDismiss={() => setResult(null)} />
      )}

      {canBulkUpdate && (
        <BulkActionBar
          selectedIds={Array.from(selected)}
          actions={actions}
          onClear={() => setSelected(new Set())}
          onDone={(bulkResult, action) => {
            setResult({ result: bulkResult, label: action.label });
            setSelected(new Set());
            router.refresh();
          }}
        />
      )}

      <table className="w-full text-left text-sm">
        <thead className="text-xs text-text-muted">
          <tr>
            {canBulkUpdate && (
              <th className="w-8 pb-2">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-border-strong bg-surface"
                />
              </th>
            )}
            <th className="pb-2">Name</th>
            <th className="pb-2">Email</th>
            <th className="pb-2">Detail</th>
            <th className="pb-2">Status</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-border hover:bg-surface-sunken/50">
              {canBulkUpdate && (
                <td className="py-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${u.name}`}
                    checked={selected.has(u.id)}
                    onChange={() => toggle(u.id)}
                    className="rounded border-border-strong bg-surface"
                  />
                </td>
              )}
              <td className="py-2 text-text-primary">
                {u.name}
                {u.studentNumber && <span className="ml-2 font-mono text-xs text-text-muted">{u.studentNumber}</span>}
              </td>
              <td className="py-2 text-text-secondary">{u.email}</td>
              <td className="py-2 text-text-secondary">{u.detail}</td>
              <td className="py-2">
                <Badge tone={STATUS_TONE[u.status] ?? "neutral"}>{u.status}</Badge>
              </td>
              <td className="py-2 text-right">
                <Link href={`/dashboard/admin/users/${roleSlug}/${u.id}`} className="text-xs text-brand-text hover:underline">
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
