"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-slate-400">Start preparing smarter today.</p>

        {referral.ref && (
          <p className="mt-4 rounded-lg border border-orange-800 bg-orange-950/30 px-3 py-2 text-xs text-orange-300">
            You were referred by an Educom partner. 🎉
          </p>
        )}
        {schoolInvite && (
          <p className="mt-4 rounded-lg border border-orange-800 bg-orange-950/30 px-3 py-2 text-xs text-orange-300">
            You&apos;re registering <strong>{schoolInvite.schoolName}</strong> via an Educom partner
            invitation.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!schoolInvite && (
            <fieldset>
              <legend className="text-sm text-slate-300">I am a:</legend>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {roleOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-lg border px-2 py-2 text-center text-xs font-medium transition ${
                      role === option.value
                        ? "border-orange-500 bg-orange-500/10 text-white"
                        : "border-slate-700 text-slate-400 hover:border-slate-500"
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
            <label className="block text-sm text-slate-300" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
          </div>

          {role === "SCHOOL_ADMIN" && (
            <div>
              <label className="block text-sm text-slate-300" htmlFor="schoolName">
                School name
              </label>
              <input
                id="schoolName"
                name="schoolName"
                type="text"
                required={!schoolInvite}
                minLength={2}
                readOnly={!!schoolInvite}
                defaultValue={schoolInvite?.schoolName}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500 read-only:text-slate-400"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 py-2 text-sm font-medium text-slate-950 transition hover:bg-orange-400 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-orange-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
