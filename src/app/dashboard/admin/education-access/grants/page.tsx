import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { createGrant, updateGrantStatus, assignGrantOwner } from "@/app/dashboard/admin/education-access/grants/actions";

const statusOptions = [
  "PROSPECT",
  "RESEARCHING",
  "QUALIFIED",
  "NOT_QUALIFIED",
  "PREPARING",
  "SUBMITTED",
  "UNDER_REVIEW",
  "AWARDED",
  "DECLINED",
  "ACTIVE",
  "REPORTING",
  "COMPLETED",
  "CLOSED",
] as const;

const priorityOptions = ["HIGH", "MEDIUM", "LOW"] as const;

const STATUS_TONE: Record<string, BadgeTone> = {
  PROSPECT: "neutral",
  RESEARCHING: "neutral",
  QUALIFIED: "info",
  NOT_QUALIFIED: "neutral",
  PREPARING: "warning",
  SUBMITTED: "warning",
  UNDER_REVIEW: "warning",
  AWARDED: "success",
  DECLINED: "neutral",
  ACTIVE: "success",
  REPORTING: "info",
  COMPLETED: "success",
  CLOSED: "neutral",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

function formatMinor(amountMinor: number | null, currency: string | null): string {
  if (amountMinor == null) return "—";
  return `${(amountMinor / 100).toLocaleString("en-US")} ${currency ?? ""}`.trim();
}

export default async function AdminEducationAccessGrantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>;
}) {
  await requireAdminPagePermission("education_access.grants_manage");

  const params = await searchParams;
  const statusFilter = params.status;
  const priorityFilter = params.priority;

  const [grants, pipeline] = await Promise.all([
    prisma.educationAccessGrant.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter as never } : {}),
        ...(priorityFilter ? { priority: priorityFilter as never } : {}),
      },
      include: { internalOwner: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    Promise.all([
      prisma.educationAccessGrant.count(),
      prisma.educationAccessGrant.count({
        where: { status: { notIn: ["PROSPECT", "RESEARCHING", "NOT_QUALIFIED"] } },
      }),
      prisma.educationAccessGrant.count({
        where: { status: { in: ["PREPARING", "SUBMITTED", "UNDER_REVIEW"] } },
      }),
      prisma.educationAccessGrant.count({ where: { status: "SUBMITTED" } }),
      prisma.educationAccessGrant.count({ where: { status: "UNDER_REVIEW" } }),
      prisma.educationAccessGrant.count({ where: { status: "AWARDED" } }),
      prisma.educationAccessGrant.aggregate({ _sum: { amountRequestedMinor: true } }),
      prisma.educationAccessGrant.aggregate({ _sum: { amountAwardedMinor: true } }),
    ]),
  ]);

  const [
    identified,
    qualified,
    inProgress,
    submitted,
    underReview,
    awarded,
    requestedSum,
    awardedSum,
  ] = pipeline;

  const pipelineMetrics = [
    { label: "Opportunities Identified", value: identified },
    { label: "Qualified Opportunities", value: qualified },
    { label: "Applications in Progress", value: inProgress },
    { label: "Applications Submitted", value: submitted },
    { label: "Applications Under Review", value: underReview },
    { label: "Grants Awarded", value: awarded },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Grant Pipeline</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Internal only — never shown to sponsors or the public. Every value below is a real count;
        a new install with no grants shows zeros, not placeholder figures.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pipelineMetrics.map((metric) => (
          <Card key={metric.label} title={metric.label}>
            <p className="text-3xl font-semibold text-text-primary">{metric.value}</p>
          </Card>
        ))}
        <Card title="Total Funding Requested">
          <p className="text-2xl font-semibold text-text-primary">
            {formatMinor(requestedSum._sum.amountRequestedMinor, "")}
          </p>
        </Card>
        <Card title="Total Funding Awarded">
          <p className="text-2xl font-semibold text-text-primary">
            {formatMinor(awardedSum._sum.amountAwardedMinor, "")}
          </p>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Filter">
          <form className="flex flex-wrap gap-2">
            <select name="status" defaultValue={statusFilter} className={inputClass + " sm:w-auto"}>
              <option value="">Any status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select name="priority" defaultValue={priorityFilter} className={inputClass + " sm:w-auto"}>
              <option value="">Any priority</option>
              {priorityOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-secondary hover:border-text-muted"
            >
              Filter
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 space-y-3">
        {grants.length === 0 ? (
          <Card title="No grant records">
            <p className="text-sm text-text-secondary">Add a funding opportunity below.</p>
          </Card>
        ) : (
          grants.map((grant) => (
            <Card key={grant.id} title={grant.funderName}>
              <p className="text-xs text-text-muted">
                {grant.programName ?? "—"}
                {grant.grantType ? ` · ${grant.grantType}` : ""}
                {grant.country ? ` · ${grant.country}` : ""}
                {grant.fundingArea ? ` · ${grant.fundingArea}` : ""}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Requested: {formatMinor(grant.amountRequestedMinor, grant.currency)} · Awarded:{" "}
                {formatMinor(grant.amountAwardedMinor, grant.currency)}
                {grant.deadline ? ` · Deadline: ${new Date(grant.deadline).toLocaleDateString("en-US")}` : ""}
              </p>
              {grant.nextAction && <p className="mt-2 text-sm text-text-secondary">Next: {grant.nextAction}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[grant.status] ?? "neutral"}>{grant.status.replaceAll("_", " ")}</Badge>
                <Badge tone={grant.priority === "HIGH" ? "warning" : "neutral"}>{grant.priority}</Badge>
                {grant.internalOwner && (
                  <span className="text-xs text-text-muted">· Owned by {grant.internalOwner.name}</span>
                )}
                <form action={updateGrantStatus} className="ml-auto flex items-center gap-2">
                  <input type="hidden" name="grantId" value={grant.id} />
                  <select name="status" defaultValue={grant.status} className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand">
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <select name="priority" defaultValue={grant.priority} className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand">
                    {priorityOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-lg border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-text-muted">
                    Update
                  </button>
                </form>
                <form action={assignGrantOwner}>
                  <input type="hidden" name="grantId" value={grant.id} />
                  <input type="hidden" name="assignToSelf" value={grant.internalOwnerId ? "" : "on"} />
                  <button type="submit" className="rounded-lg border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-text-muted">
                    {grant.internalOwnerId ? "Unassign" : "Assign to me"}
                  </button>
                </form>
              </div>
              {grant.notes && <p className="mt-2 text-xs text-text-muted">Notes: {grant.notes}</p>}
            </Card>
          ))
        )}
      </div>

      <div className="mt-6">
        <Card title="Add a funding opportunity">
          <form action={createGrant} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Funder name</label>
                <input name="funderName" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Program name</label>
                <input name="programName" className={inputClass} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Grant type</label>
                <input name="grantType" placeholder="Foundation grant, Corporate CSR…" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input name="country" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input name="website" className={inputClass} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Contact name</label>
                <input name="contactName" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contact email</label>
                <input name="contactEmail" type="email" className={inputClass} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Funding area</label>
                <input name="fundingArea" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Geographic focus</label>
                <input name="geographicFocus" className={inputClass} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Typical grant size</label>
                <input name="typicalGrantSize" placeholder="e.g. $25,000–$100,000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Deadline</label>
                <input name="deadline" type="date" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Eligibility</label>
                <input name="eligibility" className={inputClass} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className={labelClass}>Amount requested (minor units)</label>
                <input name="amountRequestedMinor" type="number" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Amount awarded (minor units)</label>
                <input name="amountAwardedMinor" type="number" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <input name="currency" placeholder="USD" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Reporting frequency</label>
                <select name="reportingFrequency" className={inputClass}>
                  <option value="">—</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="SEMIANNUAL">Semiannual</option>
                  <option value="ANNUAL">Annual</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Status</label>
                <select name="status" defaultValue="PROSPECT" className={inputClass}>
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
              Add funding opportunity
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
