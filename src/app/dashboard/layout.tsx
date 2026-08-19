import type { ReactNode } from "react";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { roleLabel, navForRole } from "@/lib/roles";
import { Logo } from "@/components/brand/logo";
import { MobileDashboardNav } from "@/components/dashboard/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const role = session?.user.role ?? "STUDENT";
  const navItems = navForRole(role);

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

  return (
    <div className="flex min-h-screen flex-1 flex-col sm:flex-row">
      <MobileDashboardNav
        navItems={navItems}
        roleLabel={roleLabel[role]}
        signOutAction={handleSignOut}
      />

      <aside className="hidden w-56 flex-col border-r border-slate-800 bg-slate-900 p-4 sm:flex">
        <Logo size="sm" />

        <nav className="mt-8 flex flex-col gap-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <p className="text-xs text-slate-500">
            Signed in as{" "}
            <span className="text-slate-300">{roleLabel[role]}</span>
          </p>
          <form action={handleSignOut}>
            <button className="w-full rounded-lg border border-slate-700 py-2 text-xs text-slate-300 hover:border-slate-500">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
