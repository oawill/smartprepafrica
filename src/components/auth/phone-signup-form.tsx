"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Label, Input, FieldError } from "@/components/ui/form";
import { OtpInput } from "@/components/ui/otp-input";

/** Phone+OTP signup for students (Door 1 — see docs/migration-plan.md
 * Revised Phase 3). Two steps: send a code to the phone, then submit
 * the code alongside the same name/email/agreeToTerms fields the
 * email+password form collects. The "phone-otp" NextAuth provider
 * (src/lib/auth.ts) creates the account and signs in in one call — see
 * that file's comment for why registration fields must be present. */
export function PhoneSignupForm({
  countryCode,
  referral,
  schoolJoin,
  voucherCode,
}: {
  countryCode: string;
  referral: { ref: string | null; campaign: string | null };
  /** Door 2 — set when the student verified a school join code/PIN
   * before switching to the phone signup method. */
  schoolJoin?: { joinCode: string; joinPin: string; schoolName: string } | null;
  /** Door 3 — set when the student verified a sponsor voucher code
   * before switching to the phone signup method. */
  voucherCode?: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    const res = await fetch("/api/auth/phone/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    setSending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not send code.");
      return;
    }

    setCodeSent(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("phone-otp", {
      phone,
      code: code.join(""),
      name: formData.get("name"),
      email: formData.get("email"),
      agreeToTerms: formData.get("agreeToTerms") === "on" ? "true" : "false",
      countryCode,
      redirect: false,
      ...(referral.ref ? { ref: referral.ref, campaign: referral.campaign ?? undefined } : {}),
      ...(schoolJoin ? { schoolJoinCode: schoolJoin.joinCode, schoolJoinPin: schoolJoin.joinPin } : {}),
      ...(voucherCode ? { voucherCode } : {}),
    });

    setSubmitting(false);

    if (result?.error) {
      setError("Invalid or expired code, or that email is already in use.");
      return;
    }

    router.push("/dashboard");
  }

  if (!codeSent) {
    return (
      <form onSubmit={handleSendCode} className="space-y-4">
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            required
            placeholder="e.g. +2348012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {error && <FieldError>{error}</FieldError>}

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60"
        >
          {sending ? "Sending code…" : "Send code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm text-text-secondary">
          Enter the code sent to <strong>{phone}</strong>.{" "}
          <button
            type="button"
            onClick={() => setCodeSent(false)}
            className="text-brand-text hover:underline"
          >
            Change number
          </button>
        </p>
        <div className="mt-2">
          <OtpInput value={code} onChange={setCode} />
        </div>
      </div>

      <div>
        <Label htmlFor="phoneName">Full name</Label>
        <Input id="phoneName" name="name" type="text" required minLength={2} />
      </div>
      <div>
        <Label htmlFor="phoneEmail">Email</Label>
        <Input id="phoneEmail" name="email" type="email" required />
      </div>

      <label className="flex items-start gap-2 text-xs text-text-secondary">
        <input type="checkbox" name="agreeToTerms" required className="mt-0.5" />
        <span>
          By creating an account, you agree to the{" "}
          <Link href="/terms" target="_blank" className="text-brand-text hover:underline">
            Terms &amp; Conditions
          </Link>{" "}
          and acknowledge the{" "}
          <Link href="/privacy" target="_blank" className="text-brand-text hover:underline">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      {error && <FieldError>{error}</FieldError>}

      <button
        type="submit"
        disabled={submitting || code.join("").length !== 6}
        className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60"
      >
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
