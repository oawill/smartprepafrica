"use client";

import { useState } from "react";
import Link from "next/link";
import type { Role } from "@prisma/client";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import type { NavItem } from "@/lib/roles";
import type { Dictionary } from "@/lib/i18n/messages/en";

export function MobileDashboardNav({
  navItems,
  roleLabel,
  signOutAction,
  otherRoles = [],
  t,
  roleLabels,
}: {
  navItems: NavItem[];
  roleLabel: string;
  signOutAction: () => Promise<void>;
  otherRoles?: Role[];
  t: Dictionary["dashboardChrome"];
  roleLabels: Dictionary["roleLabels"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border bg-surface-raised sm:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t.closeMenu : t.openMenu}
            aria-expanded={open}
            className="rounded-lg border border-border-strong p-2 text-text-secondary"
          >
            {open ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-3">
          <nav className="flex flex-col gap-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-text-secondary hover:bg-surface-sunken hover:text-text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <p className="text-xs text-text-muted">
              {t.signedInAs} <span className="text-text-secondary">{roleLabel}</span>
            </p>
            <WorkspaceSwitcher otherRoles={otherRoles} t={t} roleLabels={roleLabels} />
            <form action={signOutAction}>
              <button className="w-full rounded-lg border border-border-strong py-2 text-xs text-text-secondary hover:border-text-muted">
                {t.signOut}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
