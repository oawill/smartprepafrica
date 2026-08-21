"use client";

import type { BulkResult } from "@/lib/admin/bulk-types";

export function BulkResultBanner({ result, onDismiss }: { result: BulkResult; onDismiss: () => void }) {
  const hasFailures = result.failed.length > 0;

  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        hasFailures ? "border-amber-800 bg-amber-500/5 text-amber-300" : "border-green-900 bg-green-500/5 text-green-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p>
            Updated {result.updatedCount} record{result.updatedCount === 1 ? "" : "s"}.
            {hasFailures && ` ${result.failed.length} could not be updated.`}
          </p>
          {hasFailures && (
            <ul className="mt-2 space-y-0.5 text-xs text-amber-400/80">
              {result.failed.slice(0, 10).map((f) => (
                <li key={f.id}>
                  <span className="font-mono">{f.id.slice(0, 10)}…</span> — {f.reason}
                </li>
              ))}
              {result.failed.length > 10 && <li>…and {result.failed.length - 10} more.</li>}
            </ul>
          )}
        </div>
        <button type="button" onClick={onDismiss} className="shrink-0 text-xs text-slate-400 hover:text-slate-200">
          Dismiss
        </button>
      </div>
    </div>
  );
}
