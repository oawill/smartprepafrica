"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { roleDashboardPath } from "@/lib/roles";
import type { Role } from "@prisma/client";

const navLinks = [{ label: "Home", href: "/" }];

// Nigerian exam-prep products already supported by the platform (see
// src/lib/exam-slugs.ts) — not a hardcoded/fake list, kept in sync with
// whatever /practice actually offers.
const examPrepLinks = [
  { label: "WAEC", href: "/practice/waec" },
  { label: "NECO", href: "/practice/neco" },
  { label: "JAMB / UTME", href: "/practice/utme" },
  { label: "Post-UTME", href: "/practice/post-utme" },
];

const internationalExamLinks = [
  { label: "TOEFL", href: "/international-exams/toefl" },
  { label: "SAT", href: "/international-exams/sat" },
];

function NavDropdown({
  label,
  href,
  links,
  badge,
  onNavigate,
}: {
  label: string;
  href: string;
  links: { label: string; href: string }[];
  badge?: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="group relative">
      <Link href={href} onClick={onNavigate} className="flex items-center gap-1 text-text-secondary hover:text-text-primary">
        {label}
        {badge && (
          <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-text">
            {badge}
          </span>
        )}
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Link>
      <div className="invisible absolute left-0 top-full z-10 mt-2 w-44 rounded-lg border border-border bg-surface-raised p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className="block rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-surface-sunken hover:text-text-primary"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PublicHeader() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const dashboardHref = session?.user.role
    ? roleDashboardPath[session.user.role as Role]
    : "/dashboard";

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo size="md" />

        <div className="hidden items-center gap-5 text-sm lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-text-secondary hover:text-text-primary">
              {link.label}
            </Link>
          ))}
          <NavDropdown label="Exam Prep" href="/practice" links={examPrepLinks} />
          <Link href="/educom" className="text-text-secondary hover:text-text-primary">
            Learning
          </Link>
          <Link href="/educom/schools" className="text-text-secondary hover:text-text-primary">
            Schools
          </Link>
          <NavDropdown
            label="International Exams"
            href="/international-exams"
            links={internationalExamLinks}
            badge="New"
          />
        </div>

        <div className="hidden items-center gap-4 text-sm lg:flex">
          <ThemeToggle />
          {session ? (
            <Link
              href={dashboardHref}
              className="rounded-full bg-brand px-4 py-2 font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-text-secondary hover:text-text-primary">
                Log In
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-brand px-4 py-2 font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="rounded-lg border border-border-strong p-2 text-text-secondary"
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
        </div>
      </nav>

      {menuOpen && (
        <div className="border-t border-border px-6 py-4 lg:hidden">
          <div className="flex flex-col gap-3 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-border pt-3">
              <Link
                href="/practice"
                onClick={() => setMenuOpen(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                Exam Prep
              </Link>
              <div className="mt-2 flex flex-col gap-2 pl-4">
                {examPrepLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/educom"
              onClick={() => setMenuOpen(false)}
              className="text-text-secondary hover:text-text-primary"
            >
              Learning
            </Link>
            <Link
              href="/educom/schools"
              onClick={() => setMenuOpen(false)}
              className="text-text-secondary hover:text-text-primary"
            >
              Schools
            </Link>

            <div className="border-t border-border pt-3">
              <Link
                href="/international-exams"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
              >
                International Exams
                <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-text">
                  New
                </span>
              </Link>
              <div className="mt-2 flex flex-col gap-2 pl-4">
                {internationalExamLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              {session ? (
                <Link
                  href={dashboardHref}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-full bg-brand px-4 py-2 text-center font-medium text-brand-foreground"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="text-center text-text-secondary hover:text-text-primary"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-full bg-brand px-4 py-2 text-center font-medium text-brand-foreground"
                  >
                    Get Started
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
