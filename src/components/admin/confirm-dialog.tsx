"use client";

import { type ReactNode } from "react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  busy,
  error,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface-raised p-5 shadow-xl">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>

        {children && <div className="mt-3">{children}</div>}

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              danger
                ? "border border-danger/50 text-danger hover:border-danger"
                : "bg-brand text-brand-foreground hover:bg-brand-hover"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
