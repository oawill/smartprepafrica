"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import type { NavItem } from "@/lib/roles";

export function MobileDashboardNav({
  navItems,
  roleLabel,
  signOutAction,
}: {
  navItems: NavItem[];
  roleLabel: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-800 bg-slate-900 sm:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Logo size="sm" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="rounded-lg border border-slate-700 p-2 text-slate-300"
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

      {open && (
        <div className="border-t border-slate-800 px-4 py-3">
          <nav className="flex flex-col gap-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
            <p className="text-xs text-slate-500">
              Signed in as <span className="text-slate-300">{roleLabel}</span>
            </p>
            <form action={signOutAction}>
              <button className="w-full rounded-lg border border-slate-700 py-2 text-xs text-slate-300 hover:border-slate-500">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
