"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { BulkAction, BulkResult } from "@/lib/admin/bulk-types";

export function BulkActionBar({
  selectedIds,
  actions,
  onClear,
  onDone,
}: {
  selectedIds: string[];
  actions: BulkAction[];
  onClear: () => void;
  onDone: (result: BulkResult, action: BulkAction) => void;
}) {
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  async function handleConfirm() {
    if (!pendingAction) return;
    if (pendingAction.needsReason && !reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await pendingAction.run(selectedIds, reason.trim() || undefined);
      onDone(result, pendingAction);
      setPendingAction(null);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5">
        <span className="text-sm font-medium text-brand-text">
          {selectedIds.length} selected
        </span>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => {
                setPendingAction(action);
                setError(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                action.danger
                  ? "border border-danger/40 text-danger hover:border-danger"
                  : "border border-border-strong text-text-primary hover:border-text-muted"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-xs text-text-muted hover:text-text-primary"
        >
          Clear selection
        </button>
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction?.label ?? ""}
        message={pendingAction?.confirmMessage(selectedIds.length) ?? ""}
        confirmLabel={pendingAction?.label ?? "Confirm"}
        danger={pendingAction?.danger}
        busy={busy}
        error={error}
        onCancel={() => {
          setPendingAction(null);
          setReason("");
          setError(null);
        }}
        onConfirm={handleConfirm}
      >
        {pendingAction?.needsReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required)…"
            rows={2}
            className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-brand"
          />
        )}
      </ConfirmDialog>
    </>
  );
}
