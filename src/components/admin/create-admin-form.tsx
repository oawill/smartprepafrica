"use client";

import { useActionState } from "react";
import { createAdmin, type CreateAdminState } from "@/app/dashboard/admin/admins/actions";
import { ADMIN_ROLE_LABELS } from "@/lib/admin/permissions";
import type { AdminRole } from "@prisma/client";

const initialState: CreateAdminState = null;

export function CreateAdminForm() {
  const [state, formAction, isPending] = useActionState(createAdmin, initialState);

  return (
    <div>
      <form action={formAction} className="flex flex-wrap gap-2">
        <input
          name="name"
          placeholder="Full name"
          required
          className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-brand"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-brand"
        />
        <select
          name="adminRole"
          required
          className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">Select admin role…</option>
          {(Object.keys(ADMIN_ROLE_LABELS) as AdminRole[]).map((role) => (
            <option key={role} value={role}>
              {ADMIN_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create admin"}
        </button>
      </form>

      {state && "error" in state && (
        <p className="mt-3 text-sm text-danger">{state.error}</p>
      )}
      {state && "tempPassword" in state && (
        <div className="mt-3 rounded-lg border border-warning/40 bg-warning-surface px-4 py-3 text-sm text-warning">
          Created <strong>{state.email}</strong> with temporary password{" "}
          <code className="rounded bg-surface-sunken px-1.5 py-0.5">{state.tempPassword}</code>. This is shown once —
          share it securely over a trusted channel now.
        </div>
      )}
    </div>
  );
}
