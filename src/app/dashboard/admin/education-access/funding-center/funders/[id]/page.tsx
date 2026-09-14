import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge } from "@/components/ui/badge";
import {
  createContact,
  updateContactRelationship,
  updateFunderIntelligence,
  updateWatchlist,
} from "@/app/dashboard/admin/education-access/funding-center/funders/actions";
import { recordOutreach } from "@/app/dashboard/admin/education-access/funding-center/outreach/actions";
import { computeFunderFitScore } from "@/lib/education-access/funding-center/scoring";

const watchlistReasonOptions = [
  "Strong Strategic Fit",
  "No Current Opportunity",
  "Relationship Development",
  "Future Funding Cycle",
  "Invitation Only",
  "CSR Prospect",
  "Potential Strategic Partner",
] as const;

const permitFields = [
  ["permitsFiscalSponsorship", "Permits fiscal sponsorship"],
  ["permitsInternationalOrgs", "Permits international organizations"],
  ["permitsForProfitSocialEnterprise", "Permits for-profit social enterprises"],
  ["permitsCorporatePartnership", "Permits corporate partnerships"],
  ["permitsProgramRelatedInvestment", "Permits program-related investments"],
  ["permitsDirectInternationalGrants", "Permits direct international grants"],
] as const;

const relationshipOptions = [
  "NO_RELATIONSHIP",
  "IDENTIFIED",
  "INTRODUCED",
  "INITIAL_CONTACT",
  "CONVERSATION_STARTED",
  "ACTIVE_RELATIONSHIP",
  "EXISTING_PARTNER",
] as const;

const outreachTypes = ["EMAIL", "PHONE", "MEETING", "INTRODUCTION", "CONFERENCE", "LINKEDIN", "REFERRAL", "OTHER"] as const;

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

export default async function FunderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPagePermission("funding_center.view");
  const { id } = await params;

  const funder = await prisma.educationAccessFunder.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { createdAt: "desc" } },
      opportunities: { orderBy: { createdAt: "desc" } },
      outreach: { orderBy: { date: "desc" }, take: 20 },
    },
  });

  if (!funder) notFound();

  const funderFitScore = computeFunderFitScore(funder);

  return (
    <div>
      <Link href="/dashboard/admin/education-access/funding-center/funders" className="text-sm text-brand-text hover:underline">
        ← All funders
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-text-primary">{funder.organizationName}</h1>
        <div className="flex items-center gap-2">
          <Badge tone={funderFitScore >= 70 ? "success" : funderFitScore >= 40 ? "info" : "neutral"}>
            Funder Fit Score · {funderFitScore}
          </Badge>
          {funder.watchlisted && <Badge tone="brand">Watchlisted{funder.watchlistReason ? `: ${funder.watchlistReason}` : ""}</Badge>}
        </div>
      </div>
      <p className="text-sm text-text-secondary">
        {funder.organizationType.replaceAll("_", " ")}
        {funder.country ? ` · ${funder.country}` : ""}
        {funder.website && (
          <>
            {" · "}
            <a href={funder.website} target="_blank" rel="noreferrer" className="text-brand-text hover:underline">
              {funder.website}
            </a>
          </>
        )}
      </p>

      <div className="mt-6">
        <Card title="Watchlist">
          <p className="text-xs text-text-muted">
            For internal planning — funders worth developing a relationship with even when no
            current opportunity exists.
          </p>
          <form action={updateWatchlist} className="mt-2 space-y-2">
            <input type="hidden" name="funderId" value={funder.id} />
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" name="watchlisted" defaultChecked={funder.watchlisted} /> On watchlist
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <select name="watchlistReason" defaultValue={funder.watchlistReason ?? ""} className={inputClass}>
                <option value="">— Reason —</option>
                {watchlistReasonOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input name="watchlistNotes" defaultValue={funder.watchlistNotes ?? ""} placeholder="Notes" className={inputClass} />
            </div>
            <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
              Save Watchlist Status
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Funder Intelligence Profile">
          <form action={updateFunderIntelligence} className="space-y-3">
            <input type="hidden" name="funderId" value={funder.id} />
            <div>
              <label className={labelClass}>Overview</label>
              <textarea name="overview" defaultValue={funder.overview ?? ""} rows={2} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Known Programs</label>
              <textarea name="knownPrograms" defaultValue={funder.knownPrograms ?? ""} rows={2} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Research Notes</label>
              <textarea name="researchNotes" defaultValue={funder.researchNotes ?? ""} rows={2} className={inputClass} />
            </div>
            <div>
              <p className={labelClass}>
                Eligibility compatibility — does this funder permit a route around a nonprofit/
                501(c)(3) requirement? Leave unchecked if unknown.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {permitFields.map(([name, label]) => (
                  <label key={name} className="flex items-center gap-2 text-sm text-text-secondary">
                    <input type="checkbox" name={name} defaultChecked={Boolean(funder[name])} /> {label}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
              Save Profile
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Opportunities">
          {funder.opportunities.length === 0 ? (
            <p className="text-sm text-text-secondary">No opportunities yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {funder.opportunities.map((o) => (
                <li key={o.id}>
                  <Link href={`/dashboard/admin/education-access/funding-center/opportunities/${o.id}`} className="text-brand-text hover:underline">
                    {o.opportunityName}
                  </Link>{" "}
                  <span className="text-xs text-text-muted">({o.status.replaceAll("_", " ")})</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Contacts">
          {funder.contacts.length === 0 ? (
            <p className="text-sm text-text-secondary">No contacts yet — never fabricated.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {funder.contacts.map((c) => (
                <li key={c.id} className="border-b border-border pb-2">
                  <p className="text-text-primary">
                    {c.firstName} {c.lastName} {c.title && <span className="text-text-muted">· {c.title}</span>}
                  </p>
                  {c.email && <p className="text-xs text-text-muted">{c.email}</p>}
                  <form action={updateContactRelationship} className="mt-1 flex items-center gap-2">
                    <input type="hidden" name="contactId" value={c.id} />
                    <input type="hidden" name="funderId" value={funder.id} />
                    <select name="relationshipStrength" defaultValue={c.relationshipStrength} className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand">
                      {relationshipOptions.map((r) => (
                        <option key={r} value={r}>{r.replaceAll("_", " ")}</option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-lg border border-border-strong px-2 py-1 text-xs text-text-secondary hover:border-text-muted">
                      Save
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={createContact} className="mt-3 space-y-2 border-t border-border pt-3">
            <input type="hidden" name="funderId" value={funder.id} />
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="firstName" required placeholder="First name" className={inputClass} />
              <input name="lastName" placeholder="Last name" className={inputClass} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="title" placeholder="Title" className={inputClass} />
              <input name="email" type="email" placeholder="Email" className={inputClass} />
            </div>
            <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
              Add Contact
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Outreach History">
          {funder.outreach.length === 0 ? (
            <p className="text-sm text-text-secondary">No outreach recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {funder.outreach.map((o) => (
                <li key={o.id} className="border-b border-border pb-2">
                  <Badge tone="neutral">{o.type}</Badge> <span className="text-text-muted">{new Date(o.date).toLocaleDateString("en-US")}</span>
                  {o.subject && <p className="mt-1 text-text-primary">{o.subject}</p>}
                </li>
              ))}
            </ul>
          )}
          <form action={recordOutreach} className="mt-3 space-y-2 border-t border-border pt-3">
            <input type="hidden" name="funderId" value={funder.id} />
            <div className="grid gap-2 sm:grid-cols-2">
              <select name="type" required className={inputClass}>
                {outreachTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select name="contactId" className={inputClass}>
                <option value="">No specific contact</option>
                {funder.contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            <input name="subject" placeholder="Subject" className={inputClass} />
            <textarea name="notes" placeholder="Notes" rows={2} className={inputClass} />
            <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
              Record Outreach
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
