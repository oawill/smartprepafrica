import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getPlatformSettings } from "@/lib/legal/settings";

const columns = [
  {
    heading: "Platform",
    links: [
      { label: "Explore Courses", href: "/educom" },
      { label: "SmartPrepAfrica", href: "/practice" },
      { label: "Schools", href: "/educom/schools" },
      { label: "AI Study Coach", href: "/register" },
      { label: "Become a Partner", href: "/partners" },
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
  const legalName = settings.companyLegalName || "Educom";
  const tradingAs = settings.companyLegalName && settings.companyLegalName !== "Educom";
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Logo size="sm" />
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              Prepare smarter, pass better, achieve more.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {column.heading}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-slate-400 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          {tradingAs && <p className="mb-1">Educom is a trading name of {legalName}.</p>}
          © {year} {legalName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
