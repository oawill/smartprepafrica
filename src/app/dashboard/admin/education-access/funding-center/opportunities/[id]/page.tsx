import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge } from "@/components/ui/badge";
import {
  classifyOpportunity,
  computeEligibility,
  deadlineUrgency,
  isStale,
  ELIGIBILITY_REQUIREMENTS,
  SCORE_CATEGORY_MAX,
  type EligibilityChecklist,
} from "@/lib/education-access/funding-center/scoring";
import { ClassificationBadge, DeadlineBadge, StaleBadge } from "@/components/education-access/funding-center/badges";
import {
  updateOpportunityStatus,
  updateOpportunityScores,
  updateOpportunityEligibility,
  updateOpportunityDetails,
  markNotPursuing,
} from "@/app/dashboard/admin/education-access/funding-center/opportunities/actions";
import { startApplication } from "@/app/dashboard/admin/education-access/funding-center/applications/actions";
import { recordOutreach } from "@/app/dashboard/admin/education-access/funding-center/outreach/actions";
import { createTask } from "@/app/dashboard/admin/education-access/funding-center/tasks/actions";
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
const eligibilityValues = ["CONFIRMED", "NOT_CONFIRMED", "NOT_APPLICABLE", "DISQUALIFIED"] as const;
const outreachTypes = ["EMAIL", "PHONE", "MEETING", "INTRODUCTION", "CONFERENCE", "LINKEDIN", "REFERRAL", "OTHER"] as const;

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

function formatMinor(minor: number | null): string {
  if (minor == null) return "—";
  return (minor / 100).toLocaleString("en-US");
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPagePermission("funding_center.view");
  const { id } = await params;

  const [opportunity, settings, admins] = await Promise.all([
    prisma.educationAccessFundingOpportunity.findUnique({
      where: { id },
      include: {
        funder: { include: { contacts: true } },
        outreach: { orderBy: { date: "desc" }, include: { contact: true, owner: { select: { name: true } } } },
        tasks: { orderBy: { createdAt: "desc" } },
        applications: { orderBy: { createdAt: "desc" } },
        assignedTo: { select: { name: true } },
      },
    }),
    getPlatformSettings(),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!opportunity) notFound();

  const checklist = (opportunity.eligibilityChecklist as EligibilityChecklist | null) ?? {};
  const { eligible, disqualifyingItems } = computeEligibility(checklist);
  const totalScore = opportunity.totalScore ?? 0;
  const { classification, reasoning } = classifyOpportunity(totalScore);
  const stale = isStale(opportunity.lastVerifiedAt, settings.staleOpportunityThresholdDays);
  const urgency = deadlineUrgency(opportunity.deadline);

  return (
    <div>
      <Link href="/dashboard/admin/education-access/funding-center/opportunities" className="text-sm text-brand-text hover:underline">
        ← All opportunities
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{opportunity.opportunityName}</h1>
          <p className="text-sm text-text-secondary">
            <Link href={`/dashboard/admin/education-access/funding-center/funders/${opportunity.funderId}`} className="hover:underline">
              {opportunity.funder.organizationName}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClassificationBadge eligible={eligible} classification={classification} totalScore={totalScore} />
          <DeadlineBadge urgency={urgency} />
        </div>
      </div>
      <StaleBadge stale={stale} />
      {!eligible && (
        <p className="mt-2 text-sm text-danger">
          Not eligible: {disqualifyingItems.join(", ")}
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Opportunity Details">
          <dl className="space-y-1 text-sm">
            <div><dt className="inline text-text-muted">Funding range: </dt><dd className="inline text-text-primary">{formatMinor(opportunity.minimumAwardMinor)} – {formatMinor(opportunity.maximumAwardMinor)} {opportunity.currency}</dd></div>
            <div><dt className="inline text-text-muted">Deadline: </dt><dd className="inline text-text-primary">{opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString("en-US") : opportunity.rollingDeadline ? "Rolling" : "—"}</dd></div>
            <div><dt className="inline text-text-muted">Geographic focus: </dt><dd className="inline text-text-primary">{opportunity.geographicFocus ?? "—"}</dd></div>
            <div><dt className="inline text-text-muted">Program focus: </dt><dd className="inline text-text-primary">{opportunity.fundingFocus ?? "—"}</dd></div>
            <div><dt className="inline text-text-muted">Application method: </dt><dd className="inline text-text-primary">{opportunity.applicationMethod ?? "—"}</dd></div>
            <div><dt className="inline text-text-muted">LOI required: </dt><dd className="inline text-text-primary">{opportunity.loiRequired ? "Yes" : "No"}</dd></div>
            <div><dt className="inline text-text-muted">Match funding required: </dt><dd className="inline text-text-primary">{opportunity.matchFundingRequired ? "Yes" : "No"}</dd></div>
            {opportunity.eligibilityNotes && <div><dt className="text-text-muted">Eligibility notes:</dt><dd className="text-text-primary">{opportunity.eligibilityNotes}</dd></div>}
            {opportunity.programNotes && <div><dt className="text-text-muted">Program notes:</dt><dd className="text-text-primary">{opportunity.programNotes}</dd></div>}
            {opportunity.description && <div><dt className="text-text-muted">Description:</dt><dd className="text-text-primary">{opportunity.description}</dd></div>}
            {opportunity.opportunityUrl && (
              <div>
                <dt className="inline text-text-muted">Source: </dt>
                <dd className="inline">
                  <a href={opportunity.opportunityUrl} target="_blank" rel="noreferrer" className="text-brand-text hover:underline">
                    {opportunity.opportunityUrl}
                  </a>
                </dd>
              </div>
            )}
            <div><dt className="inline text-text-muted">Last verified: </dt><dd className="inline text-text-primary">{opportunity.lastVerifiedAt ? new Date(opportunity.lastVerifiedAt).toLocaleDateString("en-US") : "Never"}</dd></div>
          </dl>

          <form action={updateOpportunityDetails} className="mt-4 space-y-2 border-t border-border pt-3">
            <input type="hidden" name="opportunityId" value={opportunity.id} />
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Assigned to</label>
                <select name="assignedToId" defaultValue={opportunity.assignedToId ?? ""} className={inputClass}>
                  <option value="">Unassigned</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Last verified</label>
                <input name="lastVerifiedAt" type="date" defaultValue={opportunity.lastVerifiedAt?.toISOString().slice(0, 10)} className={inputClass} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Amount requested (minor units)</label>
                <input name="amountRequestedMinor" type="number" defaultValue={opportunity.amountRequestedMinor ?? ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Amount awarded (minor units)</label>
                <input name="amountAwardedMinor" type="number" defaultValue={opportunity.amountAwardedMinor ?? ""} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Next action</label>
              <input name="nextAction" defaultValue={opportunity.nextAction ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea name="notes" defaultValue={opportunity.notes ?? ""} rows={2} className={inputClass} />
            </div>
            <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
              Save details
            </button>
          </form>
        </Card>

        <Card title="Pipeline Stage">
          <form action={updateOpportunityStatus} className="space-y-2">
            <input type="hidden" name="opportunityId" value={opportunity.id} />
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Status</label>
                <select name="status" defaultValue={opportunity.status} className={inputClass}>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select name="priority" defaultValue={opportunity.priority} className={inputClass}>
                  {priorityOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
              Update stage
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
            {opportunity.applications.length === 0 && (
              <form action={startApplication}>
                <input type="hidden" name="opportunityId" value={opportunity.id} />
                <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
                  Start Application
                </button>
              </form>
            )}
            <form action={markNotPursuing}>
              <input type="hidden" name="opportunityId" value={opportunity.id} />
              <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
                Mark Not Pursuing
              </button>
            </form>
          </div>

          {opportunity.applications.length > 0 && (
            <div className="mt-3 border-t border-border pt-3 text-sm">
              <p className="text-text-muted">Application:</p>
              {opportunity.applications.map((a) => (
                <Link key={a.id} href={`/dashboard/admin/education-access/funding-center/applications/${a.id}`} className="text-brand-text hover:underline">
                  Open workspace ({a.status})
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Qualification Score">
          <p className="text-sm text-text-secondary">{reasoning}</p>
          <form action={updateOpportunityScores} className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <input type="hidden" name="opportunityId" value={opportunity.id} />
            {(
              [
                ["missionScore", "Mission Alignment"],
                ["geographicScore", "Geographic Alignment"],
                ["programScore", "Program Alignment"],
                ["eligibilityScore", "Eligibility"],
                ["fundingScore", "Funding Potential"],
                ["timingScore", "Timing"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className={labelClass}>{label} (0-{SCORE_CATEGORY_MAX[key]})</label>
                <input
                  name={key}
                  type="number"
                  min={0}
                  max={SCORE_CATEGORY_MAX[key]}
                  defaultValue={opportunity[key] ?? 0}
                  className={inputClass}
                />
              </div>
            ))}
            <div className="sm:col-span-3 lg:col-span-6">
              <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
                Save score
              </button>
            </div>
          </form>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Eligibility Gate">
          <p className="text-xs text-text-muted">
            Any requirement marked Disqualified forces &quot;Not Eligible&quot; regardless of score.
            SmartPrepAfrica Technologies Limited must not be represented as a nonprofit unless verified.
          </p>
          <form action={updateOpportunityEligibility} className="mt-3 space-y-2">
            <input type="hidden" name="opportunityId" value={opportunity.id} />
            {ELIGIBILITY_REQUIREMENTS.map((requirement) => (
              <div key={requirement} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-text-secondary">{requirement}</span>
                <select name={requirement} defaultValue={checklist[requirement] ?? ""} className={inputClass + " w-48"}>
                  <option value="">— Not set —</option>
                  {eligibilityValues.map((v) => (
                    <option key={v} value={v}>{v.replaceAll("_", " ")}</option>
                  ))}
                </select>
              </div>
            ))}
            <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover">
              Save eligibility
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Outreach History">
          {opportunity.outreach.length === 0 ? (
            <p className="text-sm text-text-secondary">No outreach recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {opportunity.outreach.map((o) => (
                <li key={o.id} className="border-b border-border pb-2">
                  <Badge tone="neutral">{o.type}</Badge>{" "}
                  <span className="text-text-muted">{new Date(o.date).toLocaleDateString("en-US")}</span>
                  {o.subject && <p className="mt-1 text-text-primary">{o.subject}</p>}
                  {o.notes && <p className="text-text-secondary">{o.notes}</p>}
                </li>
              ))}
            </ul>
          )}
          <form action={recordOutreach} className="mt-3 space-y-2 border-t border-border pt-3">
            <input type="hidden" name="funderId" value={opportunity.funderId} />
            <input type="hidden" name="opportunityId" value={opportunity.id} />
            <div className="grid gap-2 sm:grid-cols-2">
              <select name="type" required className={inputClass}>
                {outreachTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select name="contactId" className={inputClass}>
                <option value="">No specific contact</option>
                {opportunity.funder.contacts.map((c) => (
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

        <Card title="Tasks">
          {opportunity.tasks.length === 0 ? (
            <p className="text-sm text-text-secondary">No tasks yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {opportunity.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 border-b border-border pb-2">
                  <span className="text-text-primary">{t.task}</span>
                  <Badge tone={t.status === "COMPLETED" ? "success" : "neutral"}>{t.status.replaceAll("_", " ")}</Badge>
                </li>
              ))}
            </ul>
          )}
          <form action={createTask} className="mt-3 space-y-2 border-t border-border pt-3">
            <input type="hidden" name="opportunityId" value={opportunity.id} />
            <input name="task" required placeholder="Task" className={inputClass} />
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="dueDate" type="date" className={inputClass} />
              <select name="priority" defaultValue="MEDIUM" className={inputClass}>
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted">
              Add Task
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
