import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge } from "@/components/ui/badge";
import { recordOutreach } from "@/app/dashboard/admin/education-access/funding-center/outreach/actions";

const outreachTypes = ["EMAIL", "PHONE", "MEETING", "INTRODUCTION", "CONFERENCE", "LINKEDIN", "REFERRAL", "OTHER"] as const;

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

export default async function FundingCenterOutreachPage() {
  await requireAdminPagePermission("funding_center.view");

  const [outreach, funders] = await Promise.all([
    prisma.educationAccessOutreach.findMany({
      include: {
        funder: { select: { organizationName: true } },
        contact: { select: { firstName: true, lastName: true } },
        owner: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.educationAccessFunder.findMany({ select: { id: true, organizationName: true }, orderBy: { organizationName: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Outreach</h1>
      <p className="mt-1 text-sm text-text-secondary">Funding outreach CRM — every real contact touchpoint with a funder.</p>

      <div className="mt-6 space-y-3">
        {outreach.length === 0 ? (
          <Card title="No outreach recorded yet"><p className="text-sm text-text-secondary">Record one below.</p></Card>
        ) : (
          outreach.map((o) => (
            <Card key={o.id} title={o.funder.organizationName}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <Badge tone="neutral">{o.type}</Badge>
                <span>{new Date(o.date).toLocaleDateString("en-US")}</span>
                {o.contact && <span>· {o.contact.firstName} {o.contact.lastName}</span>}
                {o.owner && <span>· {o.owner.name}</span>}
              </div>
              {o.subject && <p className="mt-1 text-sm text-text-primary">{o.subject}</p>}
              {o.notes && <p className="text-sm text-text-secondary">{o.notes}</p>}
              {o.followUpDate && <p className="mt-1 text-xs text-text-muted">Follow up: {new Date(o.followUpDate).toLocaleDateString("en-US")}</p>}
            </Card>
          ))
        )}
      </div>

      <div className="mt-6">
        <Card title="Record outreach">
          <form action={recordOutreach} className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Funder</label>
                <select name="funderId" required className={inputClass}>
                  <option value="">— Select —</option>
                  {funders.map((f) => (
                    <option key={f.id} value={f.id}>{f.organizationName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select name="type" required className={inputClass}>
                  {outreachTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Date</label>
                <input name="date" type="date" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Follow-up date</label>
                <input name="followUpDate" type="date" className={inputClass} />
              </div>
            </div>
            <input name="subject" placeholder="Subject" className={inputClass} />
            <textarea name="notes" placeholder="Notes" rows={2} className={inputClass} />
            <textarea name="response" placeholder="Response received" rows={2} className={inputClass} />
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
              Record Outreach
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
