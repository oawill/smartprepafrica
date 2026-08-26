"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Label, Input, FieldError } from "@/components/ui/form";

const roleOptions = [
  { value: "STUDENT", label: "Student" },
  { value: "PARENT", label: "Parent" },
  { value: "SCHOOL_ADMIN", label: "School" },
  { value: "TEACHER", label: "Teacher" },
  { value: "SPONSOR", label: "Sponsor" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<(typeof roleOptions)[number]["value"]>("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [referral, setReferral] = useState<{ ref: string | null; campaign: string | null }>({
    ref: null,
    campaign: null,
  });
  const [schoolInvite, setSchoolInvite] = useState<{ token: string; schoolName: string } | null>(
    null
  );
  const [staffInvite, setStaffInvite] = useState<
    { token: string; role: "TEACHER" | "STUDENT"; schoolName: string } | null
  >(null);

  // Plain browser API rather than useSearchParams, so this page doesn't need
  // a Suspense boundary just to read a couple of query params once.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const campaign = params.get("campaign");
    if (ref) {
      setReferral({ ref, campaign });
      document.cookie = `edp_ref=${encodeURIComponent(ref)}; path=/; max-age=${30 * 24 * 60 * 60}`;
      if (campaign) {
        document.cookie = `edp_campaign=${encodeURIComponent(campaign)}; path=/; max-age=${30 * 24 * 60 * 60}`;
      }
    }

    const invite = params.get("schoolInvite");
    const schoolName = params.get("schoolName");
    if (invite && invite !== "invalid" && schoolName) {
      setSchoolInvite({ token: invite, schoolName });
      setRole("SCHOOL_ADMIN");
    }

    const staffToken = params.get("staffInvite");
    const staffRole = params.get("staffRole");
    if (staffToken && staffToken !== "invalid" && schoolName && (staffRole === "TEACHER" || staffRole === "STUDENT")) {
      setStaffInvite({ token: staffToken, role: staffRole, schoolName });
      setRole(staffRole);
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      role,
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      agreeToTerms: formData.get("agreeToTerms") === "on",
      ...(referral.ref ? { ref: referral.ref, campaign: referral.campaign ?? undefined } : {}),
    };
    if (role === "SCHOOL_ADMIN") {
      if (schoolInvite) {
        payload.inviteToken = schoolInvite.token;
      } else {
        payload.schoolName = formData.get("schoolName");
      }
    }
    if (staffInvite) {
      payload.staffInviteToken = staffInvite.token;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const fieldErrors = Object.values(
        (data?.error?.fieldErrors ?? {}) as Record<string, string[]>
      );
      setError(
        data?.error?.formErrors?.[0] ??
          fieldErrors[0]?.[0] ??
          (typeof data?.error === "string" ? data.error : undefined) ??
          "Could not create account."
      );
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Account created, but sign-in failed. Try logging in.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-8">
        <h1 className="text-h2 font-semibold text-text-primary">Create your account</h1>
        <p className="mt-1 text-sm text-text-secondary">Start preparing smarter today.</p>

        {referral.ref && (
          <p className="mt-4 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs text-brand-text">
            You were referred by a SmartPrepAfrica.com partner. 🎉
          </p>
        )}
        {schoolInvite && (
          <p className="mt-4 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs text-brand-text">
            You&apos;re registering <strong>{schoolInvite.schoolName}</strong> via a SmartPrepAfrica.com
            partner invitation.
          </p>
        )}
        {staffInvite && (
          <p className="mt-4 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs text-brand-text">
            You&apos;re joining <strong>{staffInvite.schoolName}</strong> as a{" "}
            {staffInvite.role === "TEACHER" ? "teacher" : "student"}.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!schoolInvite && !staffInvite && (
            <fieldset>
              <legend className="text-sm text-text-secondary">I am a:</legend>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {roleOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-lg border px-2 py-2 text-center text-xs font-medium transition ${
                      role === option.value
                        ? "border-brand bg-brand/10 text-text-primary"
                        : "border-border-strong text-text-secondary hover:border-text-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="roleOption"
                      value={option.value}
                      checked={role === option.value}
                      onChange={() => setRole(option.value)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" type="text" required minLength={2} />
          </div>

          {role === "SCHOOL_ADMIN" && (
            <div>
              <Label htmlFor="schoolName">School name</Label>
              <Input
                id="schoolName"
                name="schoolName"
                type="text"
                required={!schoolInvite}
                minLength={2}
                readOnly={!!schoolInvite}
                defaultValue={schoolInvite?.schoolName}
                className="read-only:text-text-muted"
              />
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>

          <label className="flex items-start gap-2 text-xs text-text-secondary">
            <input type="checkbox" name="agreeToTerms" required className="mt-0.5" />
            <span>
              By creating an account, you agree to the{" "}
              <Link href="/terms" target="_blank" className="text-brand-text hover:underline">
                Terms & Conditions
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
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2 text-sm font-medium text-brand-foreground transition hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-text hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
