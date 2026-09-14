import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { deadlineUrgency, computeEligibilityStatus, isRecommended } from "@/lib/education-access/funding-center/scoring";
import { DeadlineBadge } from "@/components/education-access/funding-center/badges";
import { getPlatformSettings } from "@/lib/legal/settings";

function formatMinor(minor: number | null): string {
  if (minor == null) return "—";
  return (minor / 100).toLocaleString("en-US");
}

export default async function FundingCenterDashboardPage() {
  await requireAdminPagePermission("funding_center.view");

  const [
    identified,
    qualified,
    highPriority,
    inDevelopment,
    submitted,
    underReview,
    awarded,
    declined,
    potentialSum,
    requestedSum,
    underReviewSum,
    awardedSum,
    upcomingDeadlines,
    openTasks,
  ] = await Promise.all([
    prisma.educationAccessFundingOpportunity.count(),
    prisma.educationAccessFundingOpportunity.count({ where: { status: { notIn: ["RESEARCH", "DECLINED", "CLOSED"] } } }),
    prisma.educationAccessFundingOpportunity.count({ where: { priority: "HIGH" } }),
    prisma.educationAccessFundingOpportunity.count({ where: { status: { in: ["PREPARING_LOI", "LOI_SUBMITTED", "INVITED_TO_APPLY", "PROPOSAL_DRAFTING"] } } }),
    prisma.educationAccessFundingOpportunity.count({ where: { status: "SUBMITTED" } }),
    prisma.educationAccessFundingOpportunity.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.educationAccessFundingOpportunity.count({ where: { status: "AWARDED" } }),
    prisma.educationAccessFundingOpportunity.count({ where: { status: "DECLINED" } }),
    prisma.educationAccessFundingOpportunity.aggregate({ _sum: { maximumAwardMinor: true } }),
    prisma.educationAccessFundingOpportunity.aggregate({ _sum: { amountRequestedMinor: true } }),
    prisma.educationAccessFundingOpportunity.aggregate({
      _sum: { amountRequestedMinor: true },
      where: { status: "UNDER_REVIEW" },
    }),
    prisma.educationAccessFundingOpportunity.aggregate({ _sum: { amountAwardedMinor: true } }),
    prisma.educationAccessFundingOpportunity.findMany({
      where: { deadline: { not: null }, status: { notIn: ["AWARDED", "DECLINED", "CLOSED"] } },
      orderBy: { deadline: "asc" },
      take: 10,
      include: { funder: { select: { organizationName: true } } },
    }),
    prisma.educationAccessTask.findMany({
      where: { status: { not: "COMPLETED" } },
      orderBy: { dueDate: "asc" },
      take: 10,
      include: { opportunity: { select: { opportunityName: true } } },
    }),
  ]);

  // Discovery Analytics (brief §31) — every query here excludes
  // isTestData rows so a dev seed record never inflates a real dashboard.
  const [settings, discoveries] = await Promise.all([
    getPlatformSettings(),
    prisma.educationAccessGrantDiscovery.findMany({ where: { isTestData: false } }),
  ]);
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let recommendedCount = 0;
  let notEligibleCount = 0;
  for (const d of discoveries) {
    const { status: eligibilityStatus } = computeEligibilityStatus(d.verificationChecklist as never, null);
    if (eligibilityStatus === "NOT_ELIGIBLE") notEligibleCount++;
    if (
      isRecommended({
        eligibilityStatus,
        sourceUrl: d.sourceUrl,
        deadline: d.deadline,
        rollingDeadline: d.rollingDeadline,
        totalScore: d.totalScore ?? 0,
        threshold: settings.recommendedFitScoreThreshold,
        now,
      })
    ) {
      recommendedCount++;
    }
  }

  const discoveryAnalytics = [
    { label: "Opportunities Discovered", value: discoveries.length },
    { label: "New This Week", value: discoveries.filter((d) => d.discoveredAt >= oneWeekAgo).length },
    { label: "Verified", value: discoveries.filter((d) => d.verificationStatus === "VERIFIED").length },
    { label: "Recommended", value: recommendedCount },
    { label: "Not Eligible", value: notEligibleCount },
    { label: "Duplicates", value: discoveries.filter((d) => d.duplicateStatus === "DUPLICATE").length },
    { label: "Expired", value: discoveries.filter((d) => d.deadline && d.deadline < now && !d.rollingDeadline).length },
    { label: "Added to Pipeline", value: discoveries.filter((d) => d.importedOpportunityId).length },
  ];

  const themeCounts = new Map<string, number>();
  for (const d of discoveries) {
    for (const cat of d.fundingCategories) {
      themeCounts.set(cat, (themeCounts.get(cat) ?? 0) + 1);
    }
  }
  const topThemes = [...themeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const pipeline = [
    { label: "Opportunities Identified", value: identified },
    { label: "Qualified Opportunities", value: qualified },
    { label: "High-Priority Opportunities", value: highPriority },
    { label: "Applications in Development", value: inDevelopment },
    { label: "Applications Submitted", value: submitted },
    { label: "Applications Under Review", value: underReview },
    { label: "Grants Awarded", value: awarded },
    { label: "Grants Declined", value: declined },
  ];

  const financial = [
    { label: "Potential Funding", value: potentialSum._sum.maximumAwardMinor },
    { label: "Funding Requested", value: requestedSum._sum.amountRequestedMinor },
    { label: "Funding Under Review", value: underReviewSum._sum.amountRequestedMinor },
    { label: "Funding Awarded", value: awardedSum._sum.amountAwardedMinor },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Grant &amp; Funding Center</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Internal only — never shown publicly. Every figure below is a real count from the
        database; a fresh install with no records shows zeros, not placeholder numbers.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-text-primary">Pipeline</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pipeline.map((m) => (
          <Card key={m.label} title={m.label}>
            <p className="text-3xl font-semibold text-text-primary">{m.value}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-6 text-lg font-semibold text-text-primary">Financial Pipeline</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {financial.map((m) => (
          <Card key={m.label} title={m.label}>
            <p className="text-2xl font-semibold text-text-primary">{formatMinor(m.value)}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-6 text-lg font-semibold text-text-primary">Discovery Analytics</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {discoveryAnalytics.map((m) => (
          <Card key={m.label} title={m.label}>
            <p className="text-3xl font-semibold text-text-primary">{m.value}</p>
          </Card>
        ))}
      </div>

      {topThemes.length > 0 && (
        <div className="mt-4">
          <Card title="Top Funding Themes">
            <ul className="flex flex-wrap gap-2">
              {topThemes.map(([theme, count]) => (
                <li key={theme} className="rounded-full border border-border-strong px-3 py-1 text-xs text-text-secondary">
                  {theme} · {count}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Upcoming Deadlines">
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-text-secondary">No upcoming deadlines.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcomingDeadlines.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/dashboard/admin/education-access/funding-center/opportunities/${o.id}`}
                    className="text-text-primary hover:underline"
                  >
                    {o.opportunityName} <span className="text-text-muted">· {o.funder.organizationName}</span>
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-text-muted">
                    {o.deadline && new Date(o.deadline).toLocaleDateString("en-US")}
                    <DeadlineBadge urgency={deadlineUrgency(o.deadline)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Next Actions">
          {openTasks.length === 0 ? (
            <p className="text-sm text-text-secondary">No outstanding tasks.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {openTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="text-text-primary">
                    {t.task}
                    {t.opportunity && <span className="text-text-muted"> · {t.opportunity.opportunityName}</span>}
                  </span>
                  <span className="text-xs text-text-muted">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-US") : "No due date"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
