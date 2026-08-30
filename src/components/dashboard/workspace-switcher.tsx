import type { Role } from "@prisma/client";
import { roleLabel } from "@/lib/roles";
import { switchActiveRole } from "@/app/dashboard/actions";

/** Renders nothing when otherRoles is empty — invisible for the
 * overwhelming majority of users who hold exactly one role. */
export function WorkspaceSwitcher({ otherRoles }: { otherRoles: Role[] }) {
  if (otherRoles.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs text-text-muted">Switch workspace</p>
      <div className="flex flex-wrap gap-1.5">
        {otherRoles.map((role) => (
          <form key={role} action={switchActiveRole}>
            <input type="hidden" name="role" value={role} />
            <button
              type="submit"
              className="rounded-lg border border-border-strong px-2.5 py-1.5 text-xs text-text-secondary hover:border-brand hover:text-brand-text"
            >
              {roleLabel[role]}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
