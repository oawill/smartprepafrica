import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { createFunder } from "@/app/dashboard/admin/education-access/funding-center/funders/actions";

const orgTypeOptions = [
  "PRIVATE_FOUNDATION",
  "CORPORATE_FOUNDATION",
  "CORPORATE_CSR",
  "FAMILY_FOUNDATION",
  "COMMUNITY_FOUNDATION",
  "NGO",
  "DEVELOPMENT_ORGANIZATION",
  "MULTILATERAL_ORGANIZATION",
  "GOVERNMENT_PROGRAM",
  "PHILANTHROPIC_NETWORK",
  "OTHER",
] as const;

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

export default async function FundingCenterFundersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminPagePermission("funding_center.view");
  const { q } = await searchParams;

  const funders = await prisma.educationAccessFunder.findMany({
    where: q
      ? { organizationName: { contains: q.trim(), mode: "insensitive" } }
      : undefined,
    include: { _count: { select: { opportunities: true, contacts: true } } },
    orderBy: { organizationName: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Funders</h1>
      <p className="mt-1 text-sm text-text-secondary">Never invented — every record here is a real, researched organization.</p>

      <div className="mt-6">
        <Card title="Search">
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Organization name…" className={inputClass + " flex-1"} />
            <button type="submit" className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted">
              Search
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {funders.length === 0 ? (
          <Card title="No funders yet"><p className="text-sm text-text-secondary">Add one below.</p></Card>
        ) : (
          funders.map((f) => (
            <Link key={f.id} href={`/dashboard/admin/education-access/funding-center/funders/${f.id}`} className="rounded-xl border border-border bg-surface-raised p-4 hover:border-brand">
              <p className="font-semibold text-text-primary">{f.organizationName}</p>
              <p className="text-xs text-text-muted">{f.organizationType.replaceAll("_", " ")}{f.country ? ` · ${f.country}` : ""}</p>
              <p className="mt-2 text-xs text-text-muted">{f._count.opportunities} opportunities · {f._count.contacts} contacts</p>
            </Link>
          ))
        )}
      </div>

      <div className="mt-6">
        <Card title="Add a funder">
          <form action={createFunder} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Organization name</label>
                <input name="organizationName" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Organization type</label>
                <select name="organizationType" defaultValue="PRIVATE_FOUNDATION" className={inputClass}>
                  {orgTypeOptions.map((t) => (
                    <option key={t} value={t}>{t.replaceAll("_", " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Website</label>
                <input name="website" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input name="country" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Headquarters</label>
                <input name="headquarters" className={inputClass} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Geographic focus</label>
                <input name="geographicFocus" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Funding focus</label>
                <input name="fundingFocus" className={inputClass} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
              {[
                ["educationFocus", "Education focus"],
                ["technologyFocus", "Technology focus"],
                ["youthFocus", "Youth focus"],
                ["africaFocus", "Africa focus"],
                ["nigeriaFocus", "Nigeria focus"],
                ["acceptsUnsolicitedProposals", "Accepts unsolicited proposals"],
              ].map(([name, label]) => (
                <label key={name} className="flex items-center gap-2">
                  <input type="checkbox" name={name} /> {label}
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Typical min grant (minor units)</label>
                <input name="typicalMinGrantMinor" type="number" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Typical max grant (minor units)</label>
                <input name="typicalMaxGrantMinor" type="number" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <input name="currency" placeholder="USD" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Application method</label>
              <input name="applicationMethod" className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Source URL</label>
                <input name="sourceUrl" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Last verified</label>
                <input name="lastVerifiedAt" type="date" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea name="notes" rows={2} className={inputClass} />
            </div>
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
              Add funder
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
