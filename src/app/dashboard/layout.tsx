import type { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { navForRole } from "@/lib/roles";
import { Logo } from "@/components/brand/logo";
import { MobileDashboardNav } from "@/components/dashboard/mobile-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const role = session?.user.role ?? "STUDENT";
  const locale = await getLocale();
  const t = getDictionary(locale);
  const navItems = navForRole(role, t.dashboardNav);
  const translatedRoleLabel = t.roleLabels[role];

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  // The Admin Portal owns its own full chrome (grouped nav, security
  // header) in src/app/dashboard/admin/layout.tsx — this generic
  // student/parent/teacher/etc. sidebar would otherwise double up with it.
  if (role === "ADMIN") {
    return <div className="flex min-h-screen flex-1 flex-col">{children}</div>;
  }

  // Only queried/rendered when relevant — most users hold exactly one role,
  // so this stays invisible for the overwhelming majority of accounts.
  const otherRoles = session
    ? (
        await prisma.userRole.findMany({
          where: { userId: session.user.id, role: { not: role } },
          select: { role: true },
        })
      ).map((r) => r.role)
    : [];

  return (
    <div className="flex min-h-screen flex-1 flex-col sm:flex-row">
      <MobileDashboardNav
        navItems={navItems}
        roleLabel={translatedRoleLabel}
        signOutAction={handleSignOut}
        otherRoles={otherRoles}
        t={t.dashboardChrome}
        roleLabels={t.roleLabels}
      />

      <aside className="hidden w-56 flex-col border-r border-border bg-surface-raised p-4 sm:flex">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <ThemeToggle />
        </div>

        <nav className="mt-8 flex flex-col gap-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-lg px-3 py-2 text-text-secondary hover:bg-surface-sunken hover:text-text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <p className="text-xs text-text-muted">
            {t.dashboardChrome.signedInAs}{" "}
            <span className="text-text-secondary">{translatedRoleLabel}</span>
          </p>
          <WorkspaceSwitcher otherRoles={otherRoles} t={t.dashboardChrome} roleLabels={t.roleLabels} />
          <form action={handleSignOut}>
            <button className="w-full rounded-lg border border-border-strong py-2 text-xs text-text-secondary hover:border-text-muted">
              {t.dashboardChrome.signOut}
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
