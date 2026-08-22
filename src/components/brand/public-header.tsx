"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/brand/logo";
import { roleDashboardPath } from "@/lib/roles";
import type { Role } from "@prisma/client";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Prep", href: "/practice" },
  { label: "Learning", href: "/educom" },
  { label: "Schools", href: "/educom/schools" },
  { label: "AI Study Coach", href: "/register" },
  { label: "Become a Partner", href: "/partners" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function PublicHeader() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const dashboardHref = session?.user.role
    ? roleDashboardPath[session.user.role as Role]
    : "/dashboard";

  return (
    <header className="border-b border-slate-800">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo size="md" />

        <div className="hidden items-center gap-5 text-sm lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-slate-300 hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-4 text-sm lg:flex">
          {session ? (
            <Link
              href={dashboardHref}
              className="rounded-full bg-orange-500 px-4 py-2 font-medium text-slate-950 hover:bg-orange-400"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-slate-300 hover:text-white">
                Log In
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-orange-500 px-4 py-2 font-medium text-slate-950 hover:bg-orange-400"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="rounded-lg border border-slate-700 p-2 text-slate-300 lg:hidden"
        >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-slate-800 px-6 py-4 lg:hidden">
          <div className="flex flex-col gap-3 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-slate-300 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-800 pt-3">
              {session ? (
                <Link
                  href={dashboardHref}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-full bg-orange-500 px-4 py-2 text-center font-medium text-slate-950"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="text-center text-slate-300 hover:text-white"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-full bg-orange-500 px-4 py-2 text-center font-medium text-slate-950"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
