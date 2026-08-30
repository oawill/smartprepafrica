import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { formatNaira } from "@/lib/partners/compensation";
import { saveCompensationRule } from "@/app/dashboard/admin/partners/compensation/actions";
import { requireAdminPagePermission } from "@/lib/admin/authz";

const eventTypes = [
  "STUDENT_FIRST_SUBSCRIPTION",
  "STUDENT_RECURRING_SUBSCRIPTION",
  "SCHOOL_ACTIVATION",
  "SCHOOL_STUDENT_ACTIVATION",
  "CAMPAIGN_BONUS",
  "MILESTONE_BONUS",
] as const;

export default async function AdminCompensationPage() {
  await requireAdminPagePermission("partners.approve");

  const activeRules = await prisma.partnerCommissionRule.findMany({
    where: { isActive: true },
    orderBy: { ruleKey: "asc" },
  });

  const allRules = await prisma.partnerCommissionRule.findMany({
    orderBy: [{ ruleKey: "asc" }, { version: "desc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Compensation rules</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Changes here never alter commissions already earned — each edit creates a new version and
        only affects future events.
      </p>

      <div className="mt-6 space-y-4">
        {activeRules.map((rule) => (
          <Card key={rule.id} title={`${rule.name} (v${rule.version})`}>
            <p className="text-xs text-text-muted">
              {rule.calcType === "FIXED"
                ? `Fixed: ${formatNaira(rule.fixedAmountKobo ?? 0)}`
                : `${rule.percentage}%`}{" "}
              · Hold period: {rule.qualificationHoldDays} days · Event: {rule.eventType}
            </p>
            <form action={saveCompensationRule} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <input type="hidden" name="ruleKey" value={rule.ruleKey} />
              <input
                name="name"
                defaultValue={rule.name}
                placeholder="Name"
                className="col-span-2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
              <select
                name="eventType"
                defaultValue={rule.eventType}
                className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              >
                {eventTypes.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>
              <select
                name="calcType"
                defaultValue={rule.calcType}
                className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              >
                <option value="FIXED">Fixed amount</option>
                <option value="PERCENTAGE">Percentage</option>
              </select>
              <input
                name="fixedAmountNaira"
                type="number"
                step="0.01"
                defaultValue={rule.fixedAmountKobo ? rule.fixedAmountKobo / 100 : undefined}
                placeholder="Amount (₦)"
                className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
              <input
                name="percentage"
                type="number"
                step="0.1"
                defaultValue={rule.percentage ?? undefined}
                placeholder="Percentage"
                className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
              <input
                name="qualificationHoldDays"
                type="number"
                defaultValue={rule.qualificationHoldDays}
                placeholder="Hold days"
                className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
              />
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
              >
                Save new version
              </button>
            </form>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card title="Create a new compensation rule">
          <form action={saveCompensationRule} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input
              name="ruleKey"
              placeholder="rule_key (stable id)"
              required
              className="col-span-2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <input
              name="name"
              placeholder="Display name"
              required
              className="col-span-2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <select
              name="eventType"
              defaultValue="CAMPAIGN_BONUS"
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              {eventTypes.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
            <select
              name="calcType"
              defaultValue="FIXED"
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            >
              <option value="FIXED">Fixed amount</option>
              <option value="PERCENTAGE">Percentage</option>
            </select>
            <input
              name="fixedAmountNaira"
              type="number"
              step="0.01"
              placeholder="Amount (₦)"
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <input
              name="qualificationHoldDays"
              type="number"
              defaultValue={14}
              placeholder="Hold days"
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <button
              type="submit"
              className="col-span-2 rounded-lg border border-brand/40 px-4 py-2 text-sm text-brand-text hover:border-brand"
            >
              Create rule
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Version history">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-text-muted">
              <tr>
                <th className="pb-2">Rule key</th>
                <th className="pb-2">Version</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Active</th>
                <th className="pb-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {allRules.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2 font-mono text-xs text-text-primary">{r.ruleKey}</td>
                  <td className="py-2 text-text-primary">v{r.version}</td>
                  <td className="py-2 text-text-secondary">
                    {r.calcType === "FIXED" ? formatNaira(r.fixedAmountKobo ?? 0) : `${r.percentage}%`}
                  </td>
                  <td className="py-2">
                    {r.isActive ? (
                      <span className="text-success">Active</span>
                    ) : (
                      <span className="text-text-muted">Superseded</span>
                    )}
                  </td>
                  <td className="py-2 text-text-secondary">
                    {new Date(r.createdAt).toLocaleDateString("en-NG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
