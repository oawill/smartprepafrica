import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge } from "@/components/ui/badge";
import { createPartner, setPartnerVisibility } from "@/app/dashboard/admin/education-access/partners/actions";

const orgTypeOptions = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "CORPORATION", label: "Corporation" },
  { value: "FOUNDATION", label: "Foundation" },
  { value: "NGO", label: "NGO" },
  { value: "SCHOOL", label: "School" },
  { value: "DIASPORA_ORGANIZATION", label: "Diaspora Organization" },
  { value: "ALUMNI_ASSOCIATION", label: "Alumni Association" },
  { value: "GOVERNMENT", label: "Government / Public Sector" },
  { value: "OTHER", label: "Other" },
] as const;

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

export default async function AdminEducationAccessPartnersPage() {
  await requireAdminPagePermission("education_access.partners_manage");

  const partners = await prisma.educationAccessPartner.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Education Access Partners</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Only real, confirmed partners are ever added here — a partner is never shown publicly
        until its visibility toggle is turned on.
      </p>

      <div className="mt-6 space-y-3">
        {partners.length === 0 ? (
          <Card title="No partners yet">
            <p className="text-sm text-text-secondary">Add a confirmed partner below.</p>
          </Card>
        ) : (
          partners.map((partner) => (
            <Card key={partner.id} title={partner.organizationName}>
              <p className="text-xs text-text-muted">
                {partner.organizationType.replaceAll("_", " ")}
                {partner.country ? ` · ${partner.country}` : ""}
                {partner.email ? ` · ${partner.email}` : ""}
              </p>
              {partner.description && <p className="mt-2 text-sm text-text-secondary">{partner.description}</p>}
              <div className="mt-3 flex items-center gap-3">
                <Badge tone={partner.publicVisibility ? "success" : "neutral"}>
                  {partner.publicVisibility ? "Public" : "Hidden"}
                </Badge>
                <form action={setPartnerVisibility} className="flex items-center gap-2">
                  <input type="hidden" name="partnerId" value={partner.id} />
                  <input type="hidden" name="publicVisibility" value={partner.publicVisibility ? "" : "on"} />
                  <button
                    type="submit"
                    className="rounded-lg border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-text-muted"
                  >
                    {partner.publicVisibility ? "Hide from public page" : "Show on public page"}
                  </button>
                </form>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="mt-6">
        <Card title="Add a partner">
          <form action={createPartner} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Organization name</label>
                <input name="organizationName" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Organization type</label>
                <select name="organizationType" required defaultValue="FOUNDATION" className={inputClass}>
                  {orgTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Contact name</label>
                <input name="contactName" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input name="email" type="email" className={inputClass} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Country</label>
                <input name="country" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input name="website" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Description (shown publicly if visible)</label>
              <textarea name="description" rows={3} className={inputClass} />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Add partner
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
