import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge } from "@/components/ui/badge";
import {
  classifyOpportunity,
  computeEligibilityStatus,
  computeDiscoveryConfidence,
  deadlineUrgency,
  explainFit,
  isRecommended,
  ELIGIBILITY_REQUIREMENTS,
  SCORE_CATEGORY_MAX,
  SCORE_CATEGORY_LABELS,
  type EligibilityChecklist,
} from "@/lib/education-access/funding-center/scoring";
import { ClassificationBadge, DeadlineBadge, EligibilityStatusBadge, DiscoveryConfidenceBadge } from "@/components/education-access/funding-center/badges";
import { getPlatformSettings } from "@/lib/legal/settings";
import {
  updateDiscoveryVerification,
  updateDiscoveryScore,
  dismissDiscovery,
  watchNextCycle,
  markDuplicate,
  addToPipeline,
} from "@/app/dashboard/admin/education-access/funding-center/intelligence/actions";

const eligibilityValues = ["CONFIRMED", "NOT_CONFIRMED", "NOT_APPLICABLE", "DISQUALIFIED"] as const;
const verificationStatuses = ["UNVERIFIED", "AI_EXTRACTED", "NEEDS_REVIEW", "PARTIALLY_VERIFIED", "VERIFIED", "OUTDATED", "INVALID"] as const;
const dismissalReasons = [
  "NOT_ELIGIBLE",
  "POOR_FIT",
  "DEADLINE_TOO_SOON",
  "FUNDING_TOO_SMALL",
  "FUNDING_RESTRICTIONS",
  "GEOGRAPHIC_MISMATCH",
  "PROGRAM_MISMATCH",
  "DUPLICATE",
  "EXPIRED",
  "NOT_CURRENTLY_PURSUING",
  "OTHER",
] as const;

// Funder/Opportunity/Program Fit are display-only checklist groups (brief
// §6), stored under group-prefixed keys. Eligibility deliberately reuses
// the exact ELIGIBILITY_REQUIREMENTS wording (unprefixed) so
// computeEligibilityStatus can read this same checklist directly — no
// separate translation layer between "verification" and "eligibility."
const DISPLAY_ONLY_GROUPS: Record<string, string[]> = {
  Funder: ["Organization exists", "Official website confirmed", "Funding program confirmed"],
  Opportunity: ["Opportunity currently exists", "Application currently open or rolling", "Deadline confirmed", "Award range confirmed where available"],
  "Program Fit": ["Education", "Digital learning", "AI in education", "Youth", "Africa", "Nigeria", "School access", "Exam preparation"],
};

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

function formatMinor(minor: number | null): string {
  if (minor == null) return "—";
  return (minor / 100).toLocaleString("en-US");
}

export default async function DiscoveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPagePermission("funding_center.view");
  const { id } = await params;

  const [discovery, funders, settings, possibleDuplicates] = await Promise.all([
    prisma.educationAccessGrantDiscovery.findUnique({ where: { id } }),
    prisma.educationAccessFunder.findMany({ select: { id: true, organizationName: true }, orderBy: { organizationName: "asc" } }),
    getPlatformSettings(),
    prisma.educationAccessGrantDiscovery.findMany({
      where: { id: { not: id } },
      select: { id: true, opportunityName: true, funderName: true },
      take: 50,
    }),
  ]);

  if (!discovery) notFound();

  const checklist = (discovery.verificationChecklist as EligibilityChecklist | null) ?? {};
  const { status: eligibilityStatus, barrierWarning, reasons: eligibilityReasons } = computeEligibilityStatus(checklist, null);
  const totalScore = discovery.totalScore ?? 0;
  const { classification, reasoning } = classifyOpportunity(totalScore);
  const confidence = computeDiscoveryConfidence({ ...discovery, verificationChecklist: checklist });
  const urgency = deadlineUrgency(discovery.deadline);
  const recommended = isRecommended({
    eligibilityStatus,
    sourceUrl: discovery.sourceUrl,
    deadline: discovery.deadline,
    rollingDeadline: discovery.rollingDeadline,
    totalScore,
    threshold: settings.recommendedFitScoreThreshold,
  });
  const { strengths, concerns } = explainFit(discovery, eligibilityStatus, eligibilityReasons, discovery.deadline, discovery.rollingDeadline);

  return (
    <div>
      <Link href="/dashboard/admin/education-access/funding-center/intelligence" className="text-sm text-brand-text hover:underline">
        ← Grant Intelligence
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{discovery.opportunityName}</h1>
          <p className="text-sm text-text-secondary">{discovery.funderName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClassificationBadge eligible={eligibilityStatus !== "NOT_ELIGIBLE"} classification={classification} totalScore={totalScore} />
          <EligibilityStatusBadge status={eligibilityStatus} />
          <DiscoveryConfidenceBadge confidence={confidence} />
          <DeadlineBadge urgency={urgency} />
          {recommended && <Badge tone="success">Recommended</Badge>}
        </div>
      </div>
      {discovery.dismissedAt && (
        <p className="mt-2 text-sm text-text-muted">Dismissed: {discovery.dismissedReason?.replaceAll("_", " ")}</p>
      )}
      {discovery.importedOpportunityId && (
        <p className="mt-2 text-sm text-success">
          Already added to the pipeline —{" "}
          <Link href={`/dashboard/admin/education-access/funding-center/opportunities/${discovery.importedOpportunityId}`} className="hover:underline">
            view opportunity
          </Link>
        </p>
      )}
      {barrierWarning && (
        <div className="mt-3 rounded-lg border border-danger/30 bg-danger-surface p-3 text-sm text-danger">
          <p className="font-semibold">Potential Eligibility Barrier</p>
          <ul className="mt-1 list-disc pl-5">
            {eligibilityReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Why It Fits">
          {strengths.length === 0 ? (
            <p className="text-sm text-text-secondary">No strengths identified yet — score this discovery.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
              {strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Potential Concerns">
          {concerns.length === 0 ? (
            <p className="text-sm text-text-secondary">No concerns identified.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
              {concerns.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Opportunity Details">
          <dl className="space-y-1 text-sm">
            <div><dt className="inline text-text-muted">Funding range: </dt><dd className="inline text-text-primary">{formatMinor(discovery.minimumAwardMinor)} – {formatMinor(discovery.maximumAwardMinor)} {discovery.currency}</dd></div>
            <div><dt className="inline text-text-muted">Deadline: </dt><dd className="inline text-text-primary">{discovery.deadline ? new Date(discovery.deadline).toLocaleDateString("en-US") : discovery.rollingDeadline ? "Rolling" : "—"}</dd></div>
            <div><dt className="inline text-text-muted">Geographic focus: </dt><dd className="inline text-text-primary">{discovery.geographicFocus ?? "—"}</dd></div>
            <div><dt className="inline text-text-muted">Funding focus: </dt><dd className="inline text-text-primary">{discovery.fundingFocus ?? "—"}</dd></div>
            {discovery.fundingCategories.length > 0 && (
              <div><dt className="inline text-text-muted">Categories: </dt><dd className="inline text-text-primary">{discovery.fundingCategories.join(", ")}</dd></div>
            )}
            {discovery.description && <div><dt className="text-text-muted">Description:</dt><dd className="text-text-primary">{discovery.description}</dd></div>}
            {discovery.eligibilitySummary && <div><dt className="text-text-muted">Eligibility summary:</dt><dd className="text-text-primary">{discovery.eligibilitySummary}</dd></div>}
            <div>
              <dt className="inline text-text-muted">Source: </dt>
              <dd className="inline">
                {discovery.sourceName} —{" "}
                <a href={discovery.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-text hover:underline">
                  {discovery.sourceUrl}
                </a>
              </dd>
            </div>
            <div><dt className="inline text-text-muted">Discovered: </dt><dd className="inline text-text-primary">{new Date(discovery.discoveredAt).toLocaleDateString("en-US")}</dd></div>
            <div><dt className="inline text-text-muted">Last checked: </dt><dd className="inline text-text-primary">{discovery.lastCheckedAt ? new Date(discovery.lastCheckedAt).toLocaleDateString("en-US") : "Never"}</dd></div>
          </dl>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Qualification Score">
          <p className="text-sm text-text-secondary">{reasoning}</p>
          <form action={updateDiscoveryScore} className="mt-3 grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="discoveryId" value={discovery.id} />
            {(Object.keys(SCORE_CATEGORY_MAX) as (keyof typeof SCORE_CATEGORY_MAX)[]).map((key) => (
              <div key={key}>
                <label className={labelClass}>{SCORE_CATEGORY_LABELS[key]} (0-{SCORE_CATEGORY_MAX[key]})</label>
                <input name={key} type="number" min={0} max={SCORE_CATEGORY_MAX[key]} defaultValue={discovery[key] ?? 0} className={inputClass} />
              </div>
            ))}
            <div className="sm:col-span-4">
              <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
                Save score
              </button>
            </div>
          </form>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Verification Checklist">
          <p className="text-xs text-text-muted">
            Grouped exactly as Funder / Opportunity / Eligibility / Program Fit. Any Disqualified
            item forces &quot;Not Eligible&quot; regardless of score. Never mark this Verified
            without a real source URL.
          </p>
          <form action={updateDiscoveryVerification} className="mt-3 space-y-4">
            <input type="hidden" name="discoveryId" value={discovery.id} />
            {Object.entries(DISPLAY_ONLY_GROUPS).map(([group, items]) => (
              <div key={group}>
                <p className="text-sm font-semibold text-text-primary">{group}</p>
                <div className="mt-1 space-y-1">
                  {items.map((item) => {
                    const key = `${group}: ${item}`;
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-text-secondary">{item}</span>
                        <select
                          name={key}
                          defaultValue={(checklist as Record<string, string>)[key] ?? ""}
                          className={inputClass + " w-48"}
                        >
                          <option value="">— Not set —</option>
                          {eligibilityValues.map((v) => (
                            <option key={v} value={v}>{v.replaceAll("_", " ")}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div>
              <p className="text-sm font-semibold text-text-primary">Eligibility</p>
              <div className="mt-1 space-y-1">
                {ELIGIBILITY_REQUIREMENTS.map((item) => (
                  <div key={item} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-text-secondary">{item}</span>
                    <select name={item} defaultValue={checklist[item] ?? ""} className={inputClass + " w-48"}>
                      <option value="">— Not set —</option>
                      {eligibilityValues.map((v) => (
                        <option key={v} value={v}>{v.replaceAll("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Verification status</label>
              <select name="verificationStatus" defaultValue={discovery.verificationStatus} className={inputClass + " max-w-xs"}>
                {verificationStatuses.map((s) => (
                  <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
              Save verification
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Duplicate Check">
          <p className="text-sm text-text-secondary">
            Status: <Badge tone={discovery.duplicateStatus === "NEW" ? "neutral" : "warning"}>{discovery.duplicateStatus.replaceAll("_", " ")}</Badge>
          </p>
          <form action={markDuplicate} className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="discoveryId" value={discovery.id} />
            <select name="duplicateOfId" defaultValue={discovery.duplicateOfId ?? ""} className={inputClass + " max-w-xs"}>
              <option value="">Not a duplicate</option>
              {possibleDuplicates.map((d) => (
                <option key={d.id} value={d.id}>{d.opportunityName} ({d.funderName})</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
              Save
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {!discovery.importedOpportunityId && !discovery.dismissedAt && (
          <Card title="Add to Pipeline">
            <form action={addToPipeline} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="discoveryId" value={discovery.id} />
              <div>
                <label className={labelClass}>Link to funder</label>
                <select name="funderId" required className={inputClass}>
                  <option value="">— Select —</option>
                  {funders.map((f) => (
                    <option key={f.id} value={f.id}>{f.organizationName}</option>
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
              <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
                Add to Pipeline
              </button>
            </form>
          </Card>
        )}

        {!discovery.dismissedAt && (
          <Card title="Dismiss">
            <form action={dismissDiscovery} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="discoveryId" value={discovery.id} />
              <select name="dismissedReason" required className={inputClass}>
                {dismissalReasons.map((r) => (
                  <option key={r} value={r}>{r.replaceAll("_", " ")}</option>
                ))}
              </select>
              <button type="submit" className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted">
                Dismiss
              </button>
            </form>
          </Card>
        )}

        <Card title="Recurring Opportunity?">
          <form action={watchNextCycle}>
            <input type="hidden" name="discoveryId" value={discovery.id} />
            <button type="submit" disabled={discovery.watchNextCycle} className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted disabled:opacity-60">
              {discovery.watchNextCycle ? "Watching Next Cycle" : "Watch Next Funding Cycle"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
