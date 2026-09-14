"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitFundingInquiry, type EducationAccessResult } from "@/app/education-access/actions";

const orgTypeOptions = [
  { value: "FOUNDATION", label: "Foundation" },
  { value: "CORPORATION", label: "Corporation" },
  { value: "NGO", label: "NGO" },
  { value: "GOVERNMENT", label: "Government / Public Sector" },
  { value: "DIASPORA_ORGANIZATION", label: "Diaspora Organization" },
  { value: "ALUMNI_ASSOCIATION", label: "Alumni Association" },
  { value: "SCHOOL", label: "School" },
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "OTHER", label: "Other" },
] as const;

const fundingRangeOptions = [
  "Under $10,000",
  "$10,000–$25,000",
  "$25,000–$50,000",
  "$50,000–$100,000",
  "$100,000–$250,000",
  "$250,000+",
  "Prefer Not to Say",
] as const;

const contactMethodOptions = [
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "EITHER", label: "Either" },
] as const;

const initialState: EducationAccessResult = { error: null, success: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";
const labelClass = "block text-sm text-text-secondary";

export function FundingContactForm() {
  const [state, formAction, isPending] = useActionState(submitFundingInquiry, initialState);

  if (state.success) {
    return (
      <div className="rounded-xl border border-success/40 bg-success-surface p-6">
        <p className="font-semibold text-success">Thank you 🎉</p>
        <p className="mt-2 text-sm text-text-secondary">
          Your funding inquiry has been received. Our team will reach out to schedule a
          conversation.
        </p>
        <Link href="/education-access" className="mt-4 inline-block text-sm text-brand-text hover:underline">
          ← Back to Education Access
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="fundingFullName">
            Name
          </label>
          <input id="fundingFullName" name="fullName" type="text" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="fundingOrganization">
            Organization
          </label>
          <input id="fundingOrganization" name="organization" type="text" required className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="jobTitle">
            Job Title
          </label>
          <input id="jobTitle" name="jobTitle" type="text" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="fundingOrgType">
            Organization Type
          </label>
          <select id="fundingOrgType" name="organizationType" required defaultValue="FOUNDATION" className={inputClass}>
            {orgTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="fundingEmail">
            Email
          </label>
          <input id="fundingEmail" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="fundingPhone">
            Phone (optional)
          </label>
          <input id="fundingPhone" name="phone" type="tel" className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="fundingCountry">
            Country
          </label>
          <input id="fundingCountry" name="country" type="text" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="preferredContactMethod">
            Preferred Contact Method
          </label>
          <select id="preferredContactMethod" name="preferredContactMethod" defaultValue="EMAIL" className={inputClass}>
            {contactMethodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="estimatedFundingRange">
          Estimated Funding Range
        </label>
        <select
          id="estimatedFundingRange"
          name="estimatedFundingRange"
          defaultValue="Prefer Not to Say"
          className={inputClass}
        >
          {fundingRangeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-text-muted">
          This range helps us prepare for a conversation — it is not a funding commitment.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="fundingMessage">
          Message
        </label>
        <textarea id="fundingMessage" name="message" required rows={5} minLength={10} className={inputClass} />
      </div>

      <label className="flex items-start gap-2 text-sm text-text-secondary">
        <input type="checkbox" name="consentGiven" required className="mt-1" />
        I consent to being contacted about this partnership opportunity.
      </label>

      <p className="text-xs text-text-muted">
        Information submitted through this form will be used by SmartPrepAfrica to evaluate and
        respond to potential partnership opportunities. See our{" "}
        <Link href="/privacy" className="text-brand-text hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Request a Partnership Conversation"}
      </button>
    </form>
  );
}
