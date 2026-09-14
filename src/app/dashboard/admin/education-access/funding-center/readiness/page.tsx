import { prisma } from "@/lib/prisma";
import { requireAdminPagePermission } from "@/lib/admin/authz";
import { Card } from "@/components/dashboard/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { computeReadinessScore } from "@/lib/education-access/funding-center/scoring";
import { createReadinessItem, updateReadinessItem } from "@/app/dashboard/admin/education-access/funding-center/readiness/actions";

const categories = [
  { value: "CORPORATE_DOCUMENTS", label: "Corporate Documents" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "PROGRAM", label: "Program" },
  { value: "POLICIES", label: "Policies" },
  { value: "IMPACT", label: "Impact" },
] as const;

const statusOptions = ["AVAILABLE", "DRAFT", "NEEDS_UPDATE", "MISSING"] as const;

const STATUS_TONE: Record<string, BadgeTone> = {
  AVAILABLE: "success",
  DRAFT: "warning",
  NEEDS_UPDATE: "warning",
  MISSING: "neutral",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

export default async function GrantReadinessLibraryPage() {
  await requireAdminPagePermission("funding_center.view");

  const items = await prisma.educationAccessReadinessItem.findMany({ orderBy: [{ category: "asc" }, { createdAt: "asc" }] });
  const { percent, missing } = computeReadinessScore(items);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Grant Readiness Library</h1>
      <p className="mt-1 text-sm text-text-secondary">
        SmartPrepAfrica&apos;s own application-readiness materials — confidential, admin-only.
        Computed only from real records added below.
      </p>

      <div className="mt-6">
        <Card title={`Application Readiness: ${percent}%`}>
          {missing.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {items.length === 0 ? "No readiness items tracked yet." : "Nothing missing."}
            </p>
          ) : (
            <>
              <p className="text-sm text-text-secondary">Missing:</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-text-secondary">
                {missing.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat.value);
        return (
          <div key={cat.value} className="mt-6">
            <Card title={cat.label}>
              {catItems.length === 0 ? (
                <p className="text-sm text-text-secondary">No items yet.</p>
              ) : (
                <div className="space-y-2">
                  {catItems.map((item) => (
                    <form key={item.id} action={updateReadinessItem} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                      <input type="hidden" name="itemId" value={item.id} />
                      <span className="text-sm text-text-primary">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <Badge tone={STATUS_TONE[item.status]}>{item.status.replaceAll("_", " ")}</Badge>
                        <select name="status" defaultValue={item.status} className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand">
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                          ))}
                        </select>
                        <input name="notes" defaultValue={item.notes ?? ""} placeholder="Notes" className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand" />
                        <button type="submit" className="rounded-lg border border-border-strong px-2 py-1 text-xs text-text-secondary hover:border-text-muted">
                          Save
                        </button>
                      </div>
                    </form>
                  ))}
                </div>
              )}
            </Card>
          </div>
        );
      })}

      <div className="mt-6">
        <Card title="Add a readiness item">
          <form action={createReadinessItem} className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <select name="category" required className={inputClass}>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <select name="status" defaultValue="MISSING" className={inputClass}>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                ))}
              </select>
            </div>
            <input name="label" required placeholder="e.g. Safeguarding policy" className={inputClass} />
            <textarea name="notes" placeholder="Notes" rows={2} className={inputClass} />
            <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover">
              Add item
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
