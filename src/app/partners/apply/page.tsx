"use client";

import { useActionState } from "react";
import Link from "next/link";
import { applyAsPartner, type ApplyResult } from "@/app/partners/actions";

const initialState: ApplyResult = { error: null };

const partnerTypeOptions = [
  { value: "INDIVIDUAL_AFFILIATE", label: "Individual affiliate" },
  { value: "TEACHER", label: "Teacher" },
  { value: "EDUCATION_CONSULTANT", label: "Education consultant" },
  { value: "SCHOOL_REPRESENTATIVE", label: "School representative" },
  { value: "INFLUENCER", label: "Influencer / content creator" },
  { value: "COMMUNITY_AMBASSADOR", label: "Community ambassador" },
  { value: "CORPORATE_NGO", label: "Corporate / NGO" },
  { value: "MARKETING_AGENCY", label: "Marketing agency" },
  { value: "OTHER", label: "Other" },
] as const;

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500";
const labelClass = "block text-sm text-slate-300";

export default function PartnerApplyPage() {
  const [state, formAction, isPending] = useActionState(applyAsPartner, initialState);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-xl font-semibold">Become an Educom Partner</h1>
        <p className="mt-1 text-sm text-slate-400">
          Refer students and schools to Educom and earn commission on successful conversions.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="firstName">
                First name
              </label>
              <input id="firstName" name="firstName" type="text" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="lastName">
                Last name
              </label>
              <input id="lastName" name="lastName" type="text" required className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" required className={inputClass} />
          </div>

          <div>
            <label className={labelClass} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="phone">
              Phone number
            </label>
            <input id="phone" name="phone" type="tel" required className={inputClass} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass} htmlFor="country">
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                required
                defaultValue="Nigeria"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="state">
                State
              </label>
              <input id="state" name="state" type="text" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="city">
                City
              </label>
              <input id="city" name="city" type="text" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="organization">
              Organization (optional)
            </label>
            <input id="organization" name="organization" type="text" className={inputClass} />
          </div>

          <div>
            <label className={labelClass} htmlFor="partnerType">
              Partner type
            </label>
            <select id="partnerType" name="partnerType" required className={inputClass}>
              {partnerTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="preferredPaymentMethod">
              Preferred payment method (optional)
            </label>
            <select id="preferredPaymentMethod" name="preferredPaymentMethod" className={inputClass}>
              <option value="">Not sure yet</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="PAYSTACK">Paystack</option>
              <option value="MANUAL">Other / manual arrangement</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass} htmlFor="bankName">
                Bank name (optional)
              </label>
              <input id="bankName" name="bankName" type="text" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="bankAccountName">
                Account name (optional)
              </label>
              <input id="bankAccountName" name="bankAccountName" type="text" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="bankAccountNumber">
                Account number (optional)
              </label>
              <input
                id="bankAccountNumber"
                name="bankAccountNumber"
                type="text"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="promotionPlan">
              How do you plan to promote Educom? (optional)
            </label>
            <textarea
              id="promotionPlan"
              name="promotionPlan"
              rows={3}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="referralSource">
              How did you hear about the partner program? (optional)
            </label>
            <input id="referralSource" name="referralSource" type="text" className={inputClass} />
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-400">
            <input type="checkbox" name="agreeToTerms" required className="mt-0.5" />
            <span>
              By creating an account, you agree to the{" "}
              <Link href="/terms" target="_blank" className="text-orange-400 hover:underline">
                Terms & Conditions
              </Link>{" "}
              and acknowledge the{" "}
              <Link href="/privacy" target="_blank" className="text-orange-400 hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <label className="flex items-start gap-2 text-xs text-slate-400">
            <input type="checkbox" name="termsAccepted" required className="mt-0.5" />
            <span>
              I agree to the{" "}
              <Link href="/partners/terms" target="_blank" className="text-orange-400 hover:underline">
                Educom Partner Program Terms
              </Link>{" "}
              and understand that commissions are payable only for qualifying conversions under
              the applicable compensation rules.
            </span>
          </label>

          {state.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-orange-500 py-2 text-sm font-medium text-slate-950 transition hover:bg-orange-400 disabled:opacity-60"
          >
            {isPending ? "Submitting…" : "Submit application"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already a partner?{" "}
          <Link href="/login" className="text-orange-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
