"use client";

import { useActionState, useState } from "react";
import type { InviteResult } from "@/app/dashboard/school/actions";

export function InviteForm({
  emailField,
  emailPlaceholder,
  action,
  classes,
}: {
  emailField: "teacherEmail" | "studentEmail";
  emailPlaceholder: string;
  action: (prevState: InviteResult | null, formData: FormData) => Promise<InviteResult>;
  classes?: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [copied, setCopied] = useState(false);

  const inviteLink =
    state && "token" in state && typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/school/invite/${state.token}`
      : null;

  return (
    <div>
      <form
        action={formAction}
        onSubmit={() => setCopied(false)}
        className="flex flex-wrap gap-2"
      >
        <input
          type="email"
          name={emailField}
          required
          placeholder={emailPlaceholder}
          className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
        />
        {classes && classes.length > 0 && (
          <select
            name="classId"
            className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="">No class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send invite"}
        </button>
      </form>

      {state && "error" in state && (
        <p className="mt-2 text-sm text-danger">{state.error}</p>
      )}

      {state && "token" in state && (
        state.alreadyHasAccount ? (
          <p className="mt-2 text-sm text-success">
            Invite sent — it&apos;ll appear on their dashboard next time they log in.
          </p>
        ) : (
          <div className="mt-2 rounded-lg border border-border bg-surface-sunken p-3">
            <p className="text-xs text-text-secondary">
              This person doesn&apos;t have an account yet. Share this link with them
              (WhatsApp, SMS, in person) — email sending isn&apos;t set up yet.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                readOnly
                value={inviteLink ?? ""}
                className="flex-1 rounded-lg border border-border-strong bg-surface px-2 py-1.5 text-xs text-text-secondary outline-none"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={() => {
                  if (inviteLink) navigator.clipboard.writeText(inviteLink);
                  setCopied(true);
                }}
                className="shrink-0 rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
