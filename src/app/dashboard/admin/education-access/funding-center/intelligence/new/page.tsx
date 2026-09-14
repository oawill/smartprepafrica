"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createDiscovery, type DiscoveryResult } from "@/app/dashboard/admin/education-access/funding-center/intelligence/actions";
import { FUNDING_CATEGORIES } from "@/lib/education-access/funding-center/categories";

const sourceTypeOptions = [
  { value: "FOUNDATION_WEBSITE", label: "Foundation Website" },
  { value: "CORPORATE_CSR", label: "Corporate CSR Program" },
  { value: "GOVERNMENT_PORTAL", label: "Government Funding Portal" },
  { value: "PHILANTHROPIC_NETWORK", label: "Philanthropic Network" },
  { value: "DEVELOPMENT_ORG", label: "Development Organization" },
  { value: "GRANT_DATABASE", label: "Grant Database" },
  { value: "MANUAL_URL", label: "Manually Submitted URL" },
  { value: "APPROVED_API", label: "Approved API" },
  { value: "OTHER", label: "Other" },
] as const;

const initialState: DiscoveryResult = { error: null, success: false };
const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand";
const labelClass = "block text-xs text-text-secondary";

export default function ResearchOpportunityUrlPage() {
  const [state, formAction, isPending] = useActionState(createDiscovery, initialState);

  return (
    <div>
      <Link href="/dashboard/admin/education-access/funding-center/intelligence" className="text-sm text-brand-text hover:underline">
        ← Grant Intelligence
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-text-primary">Research Opportunity URL</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Manual entry only — paste the source URL and enter what you find on the page yourself.
        Nothing here is extracted or verified automatically; every field is saved exactly as
        typed, with status <strong className="text-text-primary">Unverified</strong> until you
        run it through the verification checklist.
      </p>

      <form action={formAction} className="mt-6 max-w-2xl space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Source organization</label>
            <input name="sourceName" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Source type</label>
            <select name="sourceType" required defaultValue="FOUNDATION_WEBSITE" className={inputClass}>
              {sourceTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Source URL (required)</label>
          <input name="sourceUrl" type="url" required placeholder="https://…" className={inputClass} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Funder name</label>
            <input name="funderName" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Opportunity name</label>
            <input name="opportunityName" required className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Opportunity URL (if different from source)</label>
          <input name="opportunityUrl" type="url" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea name="description" rows={3} className={inputClass} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Funding focus</label>
            <input name="fundingFocus" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Geographic focus</label>
            <input name="geographicFocus" className={inputClass} />
          </div>
        </div>
        <div>
          <p className={labelClass}>Funding categories</p>
          <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
            {FUNDING_CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" name="fundingCategories" value={cat} /> {cat}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Minimum award (minor units)</label>
            <input name="minimumAwardMinor" type="number" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Maximum award (minor units)</label>
            <input name="maximumAwardMinor" type="number" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <input name="currency" placeholder="USD" className={inputClass} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Deadline</label>
            <input name="deadline" type="date" className={inputClass} />
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" name="rollingDeadline" /> Rolling deadline
          </label>
        </div>
        <div>
          <label className={labelClass}>Eligibility summary</label>
          <textarea name="eligibilitySummary" rows={2} className={inputClass} />
        </div>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save Discovery"}
        </button>
      </form>
    </div>
  );
}
