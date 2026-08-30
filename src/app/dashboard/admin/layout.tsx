import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/admin/authz";
import { ADMIN_ROLE_LABELS } from "@/lib/admin/permissions";
import { navForAdminRole } from "@/lib/admin/nav";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { MobileDashboardNav } from "@/components/dashboard/mobile-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminPage();
  const groups = navForAdminRole(session.user.adminRole);
  const flatItems = groups.flatMap((g) => g.items);
  const roleLabel = session.user.adminRole ? ADMIN_ROLE_LABELS[session.user.adminRole] : "Admin (no role assigned)";

  // Rare — an admin who also holds a second workspace (e.g. also teaches).
  const otherRoles = (
    await prisma.userRole.findMany({
      where: { userId: session.user.id, role: { not: "ADMIN" } },
      select: { role: true },
    })
  ).map((r) => r.role);

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col sm:flex-row">
      <MobileDashboardNav
        navItems={flatItems}
        roleLabel={roleLabel}
        signOutAction={handleSignOut}
        otherRoles={otherRoles}
      />

      <aside className="hidden w-64 flex-col border-r border-border bg-surface-raised p-4 sm:flex">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <ThemeToggle />
        </div>
        <div className="mt-6 flex-1 overflow-y-auto">
          <AdminNav groups={groups} />
        </div>
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-xs text-text-muted">
            Signed in as
            <br />
            <span className="text-text-secondary">{session.user.name}</span> · {roleLabel}
          </p>
          <WorkspaceSwitcher otherRoles={otherRoles} />
          <form action={handleSignOut}>
            <button className="w-full rounded-lg border border-border-strong py-2 text-xs text-text-secondary hover:border-text-muted">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="hidden items-center justify-between border-b border-border bg-surface px-6 py-3 sm:flex">
          <div>
            <p className="text-sm font-semibold text-text-primary">SmartPrepAfrica.com Administration</p>
            <p className="text-xs text-text-muted">
              {session.user.name} · {roleLabel}
            </p>
          </div>
          <div className="flex gap-4 text-xs text-text-secondary">
            <Link href="/dashboard/admin/security/login-activity" className="hover:text-text-primary">
              Security
            </Link>
            <form action={handleSignOut}>
              <button type="submit" className="hover:text-text-primary">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}
