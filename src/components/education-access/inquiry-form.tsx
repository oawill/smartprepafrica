"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitEducationAccessInquiry, type EducationAccessResult } from "@/app/education-access/actions";
import { findSponsorPackage } from "@/lib/education-access/packages";

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

const interestOptions = [
  { value: "SPONSOR_STUDENT", label: "Sponsor a Student" },
  { value: "SPONSOR_SCHOOL", label: "Sponsor a School" },
  { value: "SPONSOR_COMMUNITY", label: "Sponsor a Community" },
  { value: "AI_TUTOR_10K", label: "AI Tutor for 10,000 Students" },
  { value: "GIRLS_IN_STEM", label: "Girls in STEM" },
  { value: "CORPORATE_CSR", label: "Corporate CSR Partnership" },
  { value: "FOUNDATION_PARTNERSHIP", label: "Foundation Partnership" },
  { value: "OTHER", label: "Other" },
] as const;

const initialState: EducationAccessResult = { error: null, success: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";
const labelClass = "block text-sm text-text-secondary";

export function EducationAccessInquiryForm({
  defaultInterest,
  defaultPackage,
  schools = [],
}: {
  defaultInterest?: string;
  defaultPackage?: string;
  schools?: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(submitEducationAccessInquiry, initialState);
  const selectedPackage = findSponsorPackage(defaultPackage);

  if (state.success) {
    return (
      <div className="rounded-xl border border-success/40 bg-success-surface p-6">
        <p className="font-semibold text-success">Thank you 🎉</p>
        <p className="mt-2 text-sm text-text-secondary">
          Your enquiry has been received. Our team will reach out to discuss how we can work together.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-brand-text hover:underline">
          ← Back home
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {selectedPackage && (
        <div className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-text-secondary">
          You&apos;re sponsoring: <strong className="text-text-primary">{selectedPackage.name}</strong>
        </div>
      )}
      {selectedPackage && <input type="hidden" name="packageInterest" value={selectedPackage.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="fullName">
            Full Name
          </label>
          <input id="fullName" name="fullName" type="text" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="organization">
            Organization (optional)
          </label>
          <input id="organization" name="organization" type="text" className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="email">
            Email Address
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone Number (optional)
          </label>
          <input id="phone" name="phone" type="tel" className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="country">
            Country (optional)
          </label>
          <input id="country" name="country" type="text" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="estimatedStudents">
            Estimated Number of Students to Support (optional)
          </label>
          <input
            id="estimatedStudents"
            name="estimatedStudents"
            type="number"
            min={1}
            defaultValue={selectedPackage?.estimatedStudents}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="preferredLocation">
            Preferred Location or Community (optional)
          </label>
          <input
            id="preferredLocation"
            name="preferredLocation"
            type="text"
            placeholder="e.g. Lagos, a specific state, or LGA"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="preferredSchoolId">
            Preferred School (optional)
          </label>
          <select id="preferredSchoolId" name="preferredSchoolId" defaultValue="" className={inputClass}>
            <option value="">Not sure yet</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="organizationType">
          Sponsor Type
        </label>
        <select id="organizationType" name="organizationType" required defaultValue="INDIVIDUAL" className={inputClass}>
          {orgTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="sponsorshipInterest">
          Sponsorship Interest
        </label>
        <select
          id="sponsorshipInterest"
          name="sponsorshipInterest"
          required
          defaultValue={defaultInterest ?? "SPONSOR_STUDENT"}
          className={inputClass}
        >
          {interestOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="message">
          Message
        </label>
        <textarea id="message" name="message" required rows={5} minLength={10} className={inputClass} />
      </div>

      <label className="flex items-start gap-2 text-sm text-text-secondary">
        <input type="checkbox" name="consentGiven" required className="mt-1" />
        I consent to being contacted about this sponsorship or partnership.
      </label>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60"
      >
        {isPending ? "Sending…" : selectedPackage ? "Submit Sponsorship Interest" : "Submit Enquiry"}
      </button>
    </form>
  );
}
