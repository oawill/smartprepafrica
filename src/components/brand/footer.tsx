import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getPlatformSettings } from "@/lib/legal/settings";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const columns = [
  {
    heading: "Platform",
    links: [
      { label: "SmartPrepAfrica Prep", href: "/practice" },
      { label: "SmartPrepAfrica Learning", href: "/educom" },
      { label: "Schools", href: "/educom/schools" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Learning / Resources",
    links: [{ label: "AI Study Coach", href: "/register" }],
  },
  {
    heading: "Partnerships",
    links: [
      { label: "Become a Partner", href: "/partners" },
      { label: "Become a Sponsor", href: "/register" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Login", href: "/login" },
      { label: "Register", href: "/register" },
    ],
  },
];

export async function Footer() {
  const settings = await getPlatformSettings();
  const legalName = settings.companyLegalName || "Cicerah Technologies Limited";
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo size="sm" />
            <p className="mt-3 max-w-xs text-sm text-text-muted">
              Prepare smarter, pass better, achieve more.
            </p>
            <ThemeToggle className="mt-4" />
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <h3 className="text-label font-semibold uppercase tracking-wide text-text-muted">
                {column.heading}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-text-secondary hover:text-text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-text-muted">
          <p className="mb-1">SmartPrepAfrica.com is a {legalName} company.</p>
          © {year} {legalName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
