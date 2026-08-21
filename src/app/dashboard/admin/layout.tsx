import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import { requireAdminPage } from "@/lib/admin/authz";
import { ADMIN_ROLE_LABELS } from "@/lib/admin/permissions";
import { navForAdminRole } from "@/lib/admin/nav";
import { Logo } from "@/components/brand/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { MobileDashboardNav } from "@/components/dashboard/mobile-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminPage();
  const groups = navForAdminRole(session.user.adminRole);
  const flatItems = groups.flatMap((g) => g.items);
  const roleLabel = session.user.adminRole ? ADMIN_ROLE_LABELS[session.user.adminRole] : "Admin (no role assigned)";

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col sm:flex-row">
      <MobileDashboardNav navItems={flatItems} roleLabel={roleLabel} signOutAction={handleSignOut} />

      <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-900 p-4 sm:flex">
        <Logo size="sm" />
        <div className="mt-6 flex-1 overflow-y-auto">
          <AdminNav groups={groups} />
        </div>
        <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-500">
            Signed in as
            <br />
            <span className="text-slate-300">{session.user.name}</span> · {roleLabel}
          </p>
          <form action={handleSignOut}>
            <button className="w-full rounded-lg border border-slate-700 py-2 text-xs text-slate-300 hover:border-slate-500">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="hidden items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-3 sm:flex">
          <div>
            <p className="text-sm font-semibold text-slate-200">SmartPrepAfrica.com Administration</p>
            <p className="text-xs text-slate-500">
              {session.user.name} · {roleLabel}
            </p>
          </div>
          <div className="flex gap-4 text-xs text-slate-400">
            <Link href="/dashboard/admin/security/login-activity" className="hover:text-slate-200">
              Security
            </Link>
            <form action={handleSignOut}>
              <button type="submit" className="hover:text-slate-200">
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
