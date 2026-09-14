import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  classifyOpportunity,
  computeEligibilityStatus,
  deadlineUrgency,
  isRecommended,
} from "@/lib/education-access/funding-center/scoring";
import { ClassificationBadge, DeadlineBadge, EligibilityStatusBadge } from "@/components/education-access/funding-center/badges";
import { getPlatformSettings } from "@/lib/legal/settings";

const TABS = ["recommended", "new", "needs-verification", "deadline-soon", "rolling", "dismissed"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  recommended: "Recommended",
  new: "New",
  "needs-verification": "Needs Verification",
  "deadline-soon": "Deadline Soon",
  rolling: "Rolling",
  dismissed: "Dismissed",
};

const VERIFICATION_TONE: Record<string, BadgeTone> = {
  UNVERIFIED: "neutral",
  AI_EXTRACTED: "warning",
  NEEDS_REVIEW: "warning",
  PARTIALLY_VERIFIED: "info",
  VERIFIED: "success",
  OUTDATED: "danger",
  INVALID: "danger",
};

export default async function GrantIntelligenceFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  await requireAdminPagePermission("funding_center.view");
  const params = await searchParams;
  const tab: Tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "new";
  const q = params.q?.trim();

  const [discoveries, settings] = await Promise.all([
    prisma.educationAccessGrantDiscovery.findMany({
      where: q
        ? {
            OR: [
              { opportunityName: { contains: q, mode: "insensitive" } },
              { funderName: { contains: q, mode: "insensitive" } },
              { fundingFocus: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { discoveredAt: "desc" },
      take: 300,
    }),
    getPlatformSettings(),
  ]);

  const enriched = discoveries.map((d) => {
    const totalScore = d.totalScore ?? 0;
    const { classification } = classifyOpportunity(totalScore);
    const { status: eligibilityStatus } = computeEligibilityStatus(d.verificationChecklist as never, null);
    const recommended = isRecommended({
      eligibilityStatus,
      sourceUrl: d.sourceUrl,
      deadline: d.deadline,
      rollingDeadline: d.rollingDeadline,
      totalScore,
      threshold: settings.recommendedFitScoreThreshold,
    });
    const urgency = deadlineUrgency(d.deadline);
    return { ...d, totalScore, classification, eligibilityStatus, recommended, urgency };
  });

  let rows = enriched;
  if (tab === "recommended") rows = enriched.filter((d) => d.recommended && !d.dismissedAt);
  else if (tab === "new")
    rows = enriched.filter((d) => !d.dismissedAt && d.verificationStatus === "UNVERIFIED" && !d.importedOpportunityId);
  else if (tab === "needs-verification")
    rows = enriched.filter((d) => !d.dismissedAt && ["NEEDS_REVIEW", "PARTIALLY_VERIFIED", "AI_EXTRACTED"].includes(d.verificationStatus));
  else if (tab === "deadline-soon")
    rows = enriched.filter((d) => !d.dismissedAt && (d.urgency === "30_DAYS" || d.urgency === "14_DAYS" || d.urgency === "7_DAYS" || d.urgency === "48_HOURS"));
  else if (tab === "rolling") rows = enriched.filter((d) => !d.dismissedAt && d.rollingDeadline);
  else if (tab === "dismissed") rows = enriched.filter((d) => d.dismissedAt);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-text-primary">Grant Intelligence</h1>
        <Link href="/dashboard/admin/education-access/funding-center/intelligence/new" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
          Research Opportunity URL
        </Link>
      </div>
      <p className="mt-1 text-sm text-text-secondary">
        A pre-pipeline discovery feed — nothing here is in the active pipeline until explicitly
        added. Manual entry only; source URL required for every record.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`?tab=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full border px-3 py-1.5 text-xs ${tab === t ? "border-brand bg-brand/10 text-brand-text" : "border-border-strong text-text-secondary hover:border-text-muted"}`}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <Card title="Search">
          <form className="flex gap-2">
            <input type="hidden" name="tab" value={tab} />
            <input name="q" defaultValue={q} placeholder="Opportunity, funder, funding focus…" className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand" />
            <button type="submit" className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted">
              Search
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <Card title="No discoveries in this view">
            <p className="text-sm text-text-secondary">Nothing here yet.</p>
          </Card>
        ) : (
          rows.map((d) => (
            <Link
              key={d.id}
              href={`/dashboard/admin/education-access/funding-center/intelligence/${d.id}`}
              className="block rounded-xl border border-border bg-surface-raised p-4 hover:border-brand"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-text-primary">{d.opportunityName}</p>
                  <p className="text-xs text-text-muted">
                    {d.funderName}
                    {d.fundingFocus ? ` · ${d.fundingFocus}` : ""}
                    {d.geographicFocus ? ` · ${d.geographicFocus}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ClassificationBadge eligible={d.eligibilityStatus !== "NOT_ELIGIBLE"} classification={d.classification} totalScore={d.totalScore} />
                  <EligibilityStatusBadge status={d.eligibilityStatus} />
                  <Badge tone={VERIFICATION_TONE[d.verificationStatus]}>{d.verificationStatus.replaceAll("_", " ")}</Badge>
                  <DeadlineBadge urgency={d.urgency} />
                </div>
              </div>
              {d.importedOpportunityId && <p className="mt-1 text-xs text-success">Already added to pipeline</p>}
              {d.dismissedAt && <p className="mt-1 text-xs text-text-muted">Dismissed: {d.dismissedReason?.replaceAll("_", " ")}</p>}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
