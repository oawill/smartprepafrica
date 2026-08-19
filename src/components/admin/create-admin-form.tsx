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
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
        />
        <select
          name="adminRole"
          required
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
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
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400 disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create admin"}
        </button>
      </form>

      {state && "error" in state && (
        <p className="mt-3 text-sm text-red-400">{state.error}</p>
      )}
      {state && "tempPassword" in state && (
        <div className="mt-3 rounded-lg border border-amber-800 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
          Created <strong>{state.email}</strong> with temporary password{" "}
          <code className="rounded bg-slate-900 px-1.5 py-0.5">{state.tempPassword}</code>. This is shown once —
          share it securely over a trusted channel now.
        </div>
      )}
    </div>
  );
}
