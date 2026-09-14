import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import {
  classifyOpportunity,
  computeEligibility,
  deadlineUrgency,
  isStale,
} from "@/lib/education-access/funding-center/scoring";
import { ClassificationBadge, DeadlineBadge, StaleBadge } from "@/components/education-access/funding-center/badges";
import { createOpportunity, saveSearch } from "@/app/dashboard/admin/education-access/funding-center/opportunities/actions";
import { getPlatformSettings } from "@/lib/legal/settings";

const statusOptions = [
  "RESEARCH",
  "QUALIFIED",
  "PREPARING_LOI",
  "LOI_SUBMITTED",
  "INVITED_TO_APPLY",
  "PROPOSAL_DRAFTING",
  "SUBMITTED",
  "UNDER_REVIEW",
  "AWARDED",
  "DECLINED",
  "CLOSED",
] as const;

const priorityOptions = ["HIGH", "MEDIUM", "LOW"] as const;
const programTagOptions = [
  { value: "GENERAL", label: "General" },
  { value: "AI_TUTOR_10K", label: "AI Tutor for 10,000 Students" },
] as const;

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

export default async function FundingCenterOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; priority?: string; recommended?: string }>;
}) {
  const session = await requireAdminPagePermission("funding_center.view");
  const params = await searchParams;
  const q = params.q?.trim();
  const recommended = params.recommended === "1";

  const [opportunities, funders, settings, savedSearches] = await Promise.all([
    prisma.educationAccessFundingOpportunity.findMany({
      where: {
        ...(params.status ? { status: params.status as never } : {}),
        ...(params.priority ? { priority: params.priority as never } : {}),
        ...(q
          ? {
              OR: [
                { opportunityName: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { fundingFocus: { contains: q, mode: "insensitive" } },
                { funder: { organizationName: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { funder: { select: { organizationName: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.educationAccessFunder.findMany({ select: { id: true, organizationName: true }, orderBy: { organizationName: "asc" } }),
    getPlatformSettings(),
    prisma.educationAccessSavedSearch.findMany({ where: { ownerId: session.user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  let rows = opportunities.map((o) => {
    const totalScore = o.totalScore ?? 0;
    const { classification } = classifyOpportunity(totalScore);
    const { eligible } = computeEligibility(o.eligibilityChecklist as never);
    return { ...o, totalScore, classification, eligible };
  });

  if (recommended) {
    rows = rows
      .filter((o) => o.eligible)
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return aDeadline - bDeadline;
      });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Funding Opportunities</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {recommended
          ? "Recommended view — eligible opportunities only, ranked by fit score then soonest deadline."
          : "Every opportunity SmartPrepAfrica is researching or pursuing."}
      </p>

      <div className="mt-6">
        <Card title="Search & Filter">
          <form className="flex flex-wrap items-end gap-2">
            <input name="q" defaultValue={q} placeholder="Opportunity, funder, funding area…" className={inputClass + " min-w-[220px] flex-1"} />
            <select name="status" defaultValue={params.status} className={inputClass + " sm:w-auto"}>
              <option value="">Any status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select name="priority" defaultValue={params.priority} className={inputClass + " sm:w-auto"}>
              <option value="">Any priority</option>
              {priorityOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" name="recommended" value="1" defaultChecked={recommended} />
              Recommended only
            </label>
            <button type="submit" className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted">
              Apply
            </button>
          </form>

          {savedSearches.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {savedSearches.map((s) => (
                <Link
                  key={s.id}
                  href={`?${new URLSearchParams(s.filters as Record<string, string>).toString()}`}
                  className="rounded-full border border-border-strong px-3 py-1 text-text-secondary hover:border-brand"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          )}

          <form action={saveSearch} className="mt-3 flex items-center gap-2">
            <input type="hidden" name="filters" value={JSON.stringify(params)} />
            <input name="name" placeholder="Save this search as…" className={inputClass + " max-w-[220px]"} />
            <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
              Save
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <Card title="No opportunities">
            <p className="text-sm text-text-secondary">Add one below.</p>
          </Card>
        ) : (
          rows.map((o) => {
            const stale = isStale(o.lastVerifiedAt, settings.staleOpportunityThresholdDays);
            return (
              <Link
                key={o.id}
                href={`/dashboard/admin/education-access/funding-center/opportunities/${o.id}`}
                className="block rounded-xl border border-border bg-surface-raised p-4 hover:border-brand"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-text-primary">{o.opportunityName}</p>
                    <p className="text-xs text-text-muted">
                      {o.funder.organizationName}
                      {o.fundingFocus ? ` · ${o.fundingFocus}` : ""}
                      {o.geographicFocus ? ` · ${o.geographicFocus}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ClassificationBadge eligible={o.eligible} classification={o.classification} totalScore={o.totalScore} />
                    <DeadlineBadge urgency={deadlineUrgency(o.deadline)} />
                  </div>
                </div>
                <StaleBadge stale={stale} />
                <p className="mt-2 text-xs text-text-muted">
                  {o.status.replaceAll("_", " ")} · {o.priority}
                  {o.deadline ? ` · Deadline ${new Date(o.deadline).toLocaleDateString("en-US")}` : ""}
                </p>
              </Link>
            );
          })
        )}
      </div>

      <div className="mt-6">
        <Card title="Add a funding opportunity">
          <form action={createOpportunity} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Funder</label>
                <select name="funderId" required className={inputClass}>
                  <option value="">— Select —</option>
                  {funders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.organizationName}
                    </option>
                  ))}
                </select>
                {funders.length === 0 && (
                  <p className="mt-1 text-xs text-text-muted">
                    No funders yet —{" "}
                    <Link href="/dashboard/admin/education-access/funding-center/funders" className="text-brand-text hover:underline">
                      add one first
                    </Link>
                    .
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Opportunity name</label>
                <input name="opportunityName" required className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea name="description" rows={2} className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Opportunity URL</label>
                <input name="opportunityUrl" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input name="country" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Geographic focus</label>
                <input name="geographicFocus" className={inputClass} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Funding focus</label>
                <input name="fundingFocus" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Eligible countries</label>
                <input name="eligibleCountries" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Eligible org types</label>
                <input name="eligibleOrgTypes" className={inputClass} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className={labelClass}>Minimum award (minor units)</label>
                <input name="minimumAwardMinor" type="number" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Maximum award (minor units)</label>
                <input name="maximumAwardMinor" type="number" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <input name="currency" placeholder="USD" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Amount requested (minor units)</label>
                <input name="amountRequestedMinor" type="number" className={inputClass} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Application open date</label>
                <input name="applicationOpenDate" type="date" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Deadline</label>
                <input name="deadline" type="date" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Application method</label>
                <input name="applicationMethod" className={inputClass} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="rollingDeadline" /> Rolling deadline
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="loiRequired" /> LOI required
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="matchFundingRequired" /> Match funding required
              </label>
            </div>
            <div>
              <label className={labelClass}>Eligibility notes</label>
              <textarea name="eligibilityNotes" rows={2} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Program notes</label>
              <textarea name="programNotes" rows={2} className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Status</label>
                <select name="status" defaultValue="RESEARCH" className={inputClass}>
                  {statusOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select name="priority" defaultValue="MEDIUM" className={inputClass}>
                  {priorityOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Program</label>
                <select name="programTag" defaultValue="GENERAL" className={inputClass}>
                  {programTagOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Source URL</label>
                <input name="sourceUrl" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Source name</label>
                <input name="sourceName" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Retrieved date</label>
                <input name="retrievedDate" type="date" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Last verified</label>
              <input name="lastVerifiedAt" type="date" className={inputClass + " max-w-xs"} />
            </div>
            <div>
              <label className={labelClass}>Next action</label>
              <input name="nextAction" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea name="notes" rows={2} className={inputClass} />
            </div>
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
              Add opportunity
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
