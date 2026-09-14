import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
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

function formatMinor(minor: number | null): string {
  if (minor == null) return "—";
  return (minor / 100).toLocaleString("en-US");
}

export default async function FundingCenterReportsPage() {
  await requireAdminPagePermission("funding_center.view");
  const now = new Date();

  const [byStage, byFunder, applicationCounts, byProgram, settings, deadlines] = await Promise.all([
    Promise.all(
      statusOptions.map(async (status) => {
        const [count, sum] = await Promise.all([
          prisma.educationAccessFundingOpportunity.count({ where: { status } }),
          prisma.educationAccessFundingOpportunity.aggregate({ where: { status }, _sum: { amountRequestedMinor: true } }),
        ]);
        return { status, count, requested: sum._sum.amountRequestedMinor };
      })
    ),
    prisma.educationAccessFunder.findMany({
      select: {
        organizationName: true,
        opportunities: { select: { maximumAwardMinor: true, amountAwardedMinor: true } },
      },
    }),
    Promise.all([
      prisma.educationAccessApplication.count({ where: { status: "SUBMITTED" } }),
      prisma.educationAccessFundingOpportunity.count({ where: { status: "AWARDED" } }),
      prisma.educationAccessFundingOpportunity.count({ where: { status: "DECLINED" } }),
    ]),
    Promise.all(
      (["GENERAL", "AI_TUTOR_10K"] as const).map(async (tag) => {
        const [awarded, pending] = await Promise.all([
          prisma.educationAccessFundingOpportunity.aggregate({
            where: { programTag: tag, status: "AWARDED" },
            _sum: { amountAwardedMinor: true },
          }),
          prisma.educationAccessFundingOpportunity.aggregate({
            where: { programTag: tag, status: { notIn: ["AWARDED", "DECLINED", "CLOSED"] } },
            _sum: { amountRequestedMinor: true },
          }),
        ]);
        return { tag, awarded: awarded._sum.amountAwardedMinor, pending: pending._sum.amountRequestedMinor };
      })
    ),
    getPlatformSettings(),
    Promise.all(
      [30, 60, 90].map(async (days) => {
        const until = new Date(now);
        until.setDate(until.getDate() + days);
        return {
          days,
          count: await prisma.educationAccessFundingOpportunity.count({
            where: { deadline: { lte: until, gte: now }, status: { notIn: ["AWARDED", "DECLINED", "CLOSED"] } },
          }),
        };
      })
    ),
  ]);

  const [submittedCount, awardedCount, declinedCount] = applicationCounts;
  const terminalCount = awardedCount + declinedCount;
  const successRate = terminalCount > 0 ? Math.round((awardedCount / terminalCount) * 100) : null;

  const aiTutor = byProgram.find((p) => p.tag === "AI_TUTOR_10K");
  const studentsFundedKnown = settings.costPerStudentApproved && settings.annualCostPerStudentMinor;
  const studentsFunded =
    studentsFundedKnown && aiTutor?.awarded
      ? Math.floor(aiTutor.awarded / settings.annualCostPerStudentMinor!)
      : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Reports</h1>
      <p className="mt-1 text-sm text-text-secondary">Internal only. Every figure is computed from real records.</p>

      <div className="mt-6">
        <Card title="Opportunity Pipeline">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-text-muted">
              <tr><th className="pb-2">Stage</th><th className="pb-2">Count</th><th className="pb-2">Requested</th></tr>
            </thead>
            <tbody>
              {byStage.map((row) => (
                <tr key={row.status} className="border-t border-border">
                  <td className="py-1.5 text-text-primary">{row.status.replaceAll("_", " ")}</td>
                  <td className="py-1.5 text-text-secondary">{row.count}</td>
                  <td className="py-1.5 text-text-secondary">{formatMinor(row.requested)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Funder Pipeline">
          {byFunder.length === 0 ? (
            <p className="text-sm text-text-secondary">No funders yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr><th className="pb-2">Funder</th><th className="pb-2">Potential</th><th className="pb-2">Awarded</th></tr>
              </thead>
              <tbody>
                {byFunder.map((f) => {
                  const potential = f.opportunities.reduce((sum, o) => sum + (o.maximumAwardMinor ?? 0), 0);
                  const awarded = f.opportunities.reduce((sum, o) => sum + (o.amountAwardedMinor ?? 0), 0);
                  return (
                    <tr key={f.organizationName} className="border-t border-border">
                      <td className="py-1.5 text-text-primary">{f.organizationName}</td>
                      <td className="py-1.5 text-text-secondary">{formatMinor(potential || null)}</td>
                      <td className="py-1.5 text-text-secondary">{formatMinor(awarded || null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Application Performance">
          <p className="text-sm text-text-secondary">Submitted: {submittedCount} · Awarded: {awardedCount} · Declined: {declinedCount}</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            {successRate !== null ? `${successRate}%` : "Not enough data yet"}
          </p>
          <p className="text-xs text-text-muted">Success rate (only calculated once at least one application has a terminal outcome)</p>
        </Card>

        <Card title="Upcoming Deadlines">
          <ul className="space-y-1 text-sm">
            {deadlines.map((d) => (
              <li key={d.days} className="flex justify-between">
                <span className="text-text-secondary">Next {d.days} days</span>
                <span className="text-text-primary">{d.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Funding by Program">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-text-muted">
              <tr><th className="pb-2">Program</th><th className="pb-2">Awarded</th><th className="pb-2">Pending</th></tr>
            </thead>
            <tbody>
              {byProgram.map((p) => (
                <tr key={p.tag} className="border-t border-border">
                  <td className="py-1.5 text-text-primary">{p.tag === "AI_TUTOR_10K" ? "AI Tutor for 10,000 Students" : "General"}</td>
                  <td className="py-1.5 text-text-secondary">{formatMinor(p.awarded)}</td>
                  <td className="py-1.5 text-text-secondary">{formatMinor(p.pending)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-text-secondary">
            Students potentially funded (AI Tutor for 10,000 Students):{" "}
            {studentsFunded !== null ? studentsFunded.toLocaleString("en-US") : "Pending cost-per-student approval"}
          </p>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Data Export (CSV)">
          <p className="text-xs text-text-muted">Includes internal notes — links require Funding Center management permission.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["opportunities", "funders", "applications", "outreach", "tasks"].map((entity) => (
              <a
                key={entity}
                href={`/api/admin/education-access/funding-center/export/${entity}`}
                className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted"
              >
                Export {entity}
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
