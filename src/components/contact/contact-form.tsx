"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { submitContactForm, type ContactResult } from "@/app/contact/actions";

const accountTypeOptions = [
  { value: "STUDENT", label: "Student" },
  { value: "PARENT", label: "Parent" },
  { value: "TEACHER", label: "Teacher" },
  { value: "SCHOOL", label: "School" },
  { value: "SPONSOR", label: "Sponsor" },
  { value: "PARTNER", label: "Partner" },
  { value: "OTHER", label: "Other" },
] as const;

const topicOptions = [
  { value: "GENERAL_INQUIRY", label: "General Inquiry" },
  { value: "ACCOUNT_SUPPORT", label: "Account Support" },
  { value: "BILLING", label: "Billing" },
  { value: "COURSE_SUPPORT", label: "Course Support" },
  { value: "SCHOOL_REGISTRATION", label: "School Registration" },
  { value: "PARTNER_PROGRAM", label: "Partner Program" },
  { value: "AI_STUDY_COACH", label: "AI Study Coach" },
  { value: "TECHNICAL_PROBLEM", label: "Technical Problem" },
  { value: "REPORT_ISSUE", label: "Report an Issue" },
  { value: "OTHER", label: "Other" },
] as const;

const initialState: ContactResult = { error: null, success: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand";
const labelClass = "block text-sm text-text-secondary";

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState);
  const [defaultTopic, setDefaultTopic] = useState<string>("GENERAL_INQUIRY");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic");
    if (topic && topicOptions.some((t) => t.value === topic)) {
      setDefaultTopic(topic);
    }
  }, []);

  if (state.success) {
    return (
      <div className="mt-8 rounded-xl border border-success/40 bg-success-surface p-6">
        <p className="font-semibold text-success">Message sent 🎉</p>
        <p className="mt-2 text-sm text-text-secondary">
          Thanks for reaching out — our team will get back to you as soon as possible.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-brand-text hover:underline">
          ← Back home
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="firstName">
            First Name
          </label>
          <input id="firstName" name="firstName" type="text" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">
            Last Name
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
        <label className={labelClass} htmlFor="phone">
          Phone (optional)
        </label>
        <input id="phone" name="phone" type="tel" className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="accountType">
          Account Type
        </label>
        <select id="accountType" name="accountType" required defaultValue="STUDENT" className={inputClass}>
          {accountTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="topic">
          Topic
        </label>
        <select
          id="topic"
          name="topic"
          required
          value={defaultTopic}
          onChange={(e) => setDefaultTopic(e.target.value)}
          className={inputClass}
        >
          {topicOptions.map((opt) => (
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

      <label className="flex items-start gap-2 text-xs text-text-secondary">
        <input type="checkbox" name="agree" required className="mt-0.5" />
        <span>I agree that SmartPrepAfrica.com may use this information to respond to my request.</span>
      </label>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
