"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Label, Input, FieldError } from "@/components/ui/form";
import { PhoneSignupForm } from "@/components/auth/phone-signup-form";

const roleOptions = [
  { value: "STUDENT", label: "Student" },
  { value: "PARENT", label: "Parent" },
  { value: "SCHOOL_ADMIN", label: "School" },
  { value: "TEACHER", label: "Teacher" },
  { value: "SPONSOR", label: "Sponsor" },
] as const;

export type ActiveCountry = { code: string; name: string; flag: string };
export type ExamsByCountry = Record<
  string,
  { code: string; name: string; subjects: { id: string; name: string }[] }[]
>;

export default function RegisterForm({
  countries,
  examsByCountry,
}: {
  countries: ActiveCountry[];
  examsByCountry: ExamsByCountry;
}) {
  const router = useRouter();
  const [role, setRole] = useState<(typeof roleOptions)[number]["value"]>("STUDENT");
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("email");
  const [countryCode, setCountryCode] = useState(countries[0]?.code ?? "NG");
  const [examCodes, setExamCodes] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
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
  const [schoolJoin, setSchoolJoin] = useState<{ joinCode: string; joinPin: string; schoolName: string } | null>(
    null
  );
  const [showJoinCodeForm, setShowJoinCodeForm] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinPinInput, setJoinPinInput] = useState("");
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);
  const [verifyingJoinCode, setVerifyingJoinCode] = useState(false);
  const [voucher, setVoucher] = useState<{ code: string; planLabel: string } | null>(null);
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [verifyingVoucher, setVerifyingVoucher] = useState(false);

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

  const availableExams = examsByCountry[countryCode] ?? [];
  const availableSubjects = availableExams
    .filter((exam) => examCodes.includes(exam.code))
    .flatMap((exam) => exam.subjects)
    .filter((subject, index, all) => all.findIndex((s) => s.id === subject.id) === index);

  function toggleExamCode(code: string) {
    setExamCodes((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
    );
  }

  function toggleSubjectId(id: string) {
    setSubjectIds((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id]
    );
  }

  async function handleVerifyJoinCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinCodeError(null);
    setVerifyingJoinCode(true);

    const res = await fetch("/api/school-join/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: joinCodeInput, joinPin: joinPinInput }),
    });
    const data = await res.json().catch(() => null);

    setVerifyingJoinCode(false);

    if (!res.ok) {
      setJoinCodeError(data?.error ?? "Invalid school code or PIN.");
      return;
    }

    setSchoolJoin({ joinCode: joinCodeInput, joinPin: joinPinInput, schoolName: data.schoolName });
    setShowJoinCodeForm(false);
  }

  async function handleVerifyVoucher(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVoucherError(null);
    setVerifyingVoucher(true);

    const res = await fetch("/api/sponsor-code/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: voucherCodeInput }),
    });
    const data = await res.json().catch(() => null);

    setVerifyingVoucher(false);

    if (!res.ok) {
      setVoucherError(data?.error ?? "Invalid or expired sponsor code.");
      return;
    }

    setVoucher({ code: voucherCodeInput, planLabel: data.planLabel });
    setShowVoucherForm(false);
  }

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
      countryCode,
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
    } else if (schoolJoin && (role === "STUDENT" || role === "TEACHER")) {
      payload.schoolJoinCode = schoolJoin.joinCode;
      payload.schoolJoinPin = schoolJoin.joinPin;
    }
    if (role === "STUDENT" && !staffInvite) {
      const validSubjectIds = new Set(availableSubjects.map((s) => s.id));
      payload.examCodes = examCodes;
      payload.subjectIds = subjectIds.filter((id) => validSubjectIds.has(id));
      if (voucher) payload.voucherCode = voucher.code;
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

        <div className="mt-6 space-y-4">
          {countries.length > 1 && (
            <div>
              <Label htmlFor="countryCode">Where are you studying?</Label>
              <select
                id="countryCode"
                name="countryCode"
                value={countryCode}
                onChange={(event) => {
                  setCountryCode(event.target.value);
                  setExamCodes([]);
                  setSubjectIds([]);
                }}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {(role === "STUDENT" || role === "TEACHER") && !staffInvite && !schoolInvite && (
            <div>
              {schoolJoin ? (
                <p className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs text-brand-text">
                  You&apos;re joining <strong>{schoolJoin.schoolName}</strong> with a school join code.{" "}
                  <button
                    type="button"
                    onClick={() => setSchoolJoin(null)}
                    className="underline"
                  >
                    Change
                  </button>
                </p>
              ) : showJoinCodeForm ? (
                <form onSubmit={handleVerifyJoinCode} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Join code"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      required
                    />
                    <Input
                      placeholder="PIN"
                      value={joinPinInput}
                      onChange={(e) => setJoinPinInput(e.target.value)}
                      required
                    />
                  </div>
                  {joinCodeError && <FieldError>{joinCodeError}</FieldError>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={verifyingJoinCode}
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-60"
                    >
                      {verifyingJoinCode ? "Checking…" : "Verify"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowJoinCodeForm(false)}
                      className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowJoinCodeForm(true)}
                  className="text-xs text-brand-text hover:underline"
                >
                  Have a school join code?
                </button>
              )}
            </div>
          )}

          {role === "STUDENT" && !staffInvite && !schoolInvite && (
            <div>
              {voucher ? (
                <p className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs text-brand-text">
                  You&apos;ll get 30 days of <strong>{voucher.planLabel}</strong> on us.{" "}
                  <button type="button" onClick={() => setVoucher(null)} className="underline">
                    Change
                  </button>
                </p>
              ) : showVoucherForm ? (
                <form onSubmit={handleVerifyVoucher} className="space-y-2 rounded-lg border border-border p-3">
                  <Input
                    placeholder="Sponsor code"
                    value={voucherCodeInput}
                    onChange={(e) => setVoucherCodeInput(e.target.value)}
                    required
                  />
                  {voucherError && <FieldError>{voucherError}</FieldError>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={verifyingVoucher}
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-60"
                    >
                      {verifyingVoucher ? "Checking…" : "Verify"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVoucherForm(false)}
                      className="rounded-lg border border-border-strong px-3 py-1.5 text-xs text-text-secondary hover:border-text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowVoucherForm(true)}
                  className="text-xs text-brand-text hover:underline"
                >
                  Have a sponsor code?
                </button>
              )}
            </div>
          )}

          {role === "STUDENT" && !staffInvite && !schoolInvite && (
            <fieldset>
              <legend className="text-sm text-text-secondary">Sign up with:</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["email", "phone"] as const).map((method) => (
                  <label
                    key={method}
                    className={`cursor-pointer rounded-lg border px-2 py-2 text-center text-xs font-medium transition ${
                      signupMethod === method
                        ? "border-brand bg-brand/10 text-text-primary"
                        : "border-border-strong text-text-secondary hover:border-text-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="signupMethod"
                      value={method}
                      checked={signupMethod === method}
                      onChange={() => setSignupMethod(method)}
                      className="sr-only"
                    />
                    {method === "email" ? "Email" : "Phone"}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

        </div>

        {role === "STUDENT" && !staffInvite && signupMethod === "phone" ? (
          <div className="mt-4">
            <PhoneSignupForm
              countryCode={countryCode}
              referral={referral}
              schoolJoin={schoolJoin}
              voucherCode={voucher?.code}
            />
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {role === "STUDENT" && !staffInvite && availableExams.length > 0 && (
            <fieldset>
              <legend className="text-sm text-text-secondary">What are you preparing for? (optional)</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableExams.map((exam) => (
                  <label
                    key={exam.code}
                    className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                      examCodes.includes(exam.code)
                        ? "border-brand bg-brand/10 text-text-primary"
                        : "border-border-strong text-text-secondary hover:border-text-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={examCodes.includes(exam.code)}
                      onChange={() => toggleExamCode(exam.code)}
                      className="sr-only"
                    />
                    {exam.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {role === "STUDENT" && !staffInvite && availableSubjects.length > 0 && (
            <fieldset>
              <legend className="text-sm text-text-secondary">Subjects (optional)</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableSubjects.map((subject) => (
                  <label
                    key={subject.id}
                    className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                      subjectIds.includes(subject.id)
                        ? "border-brand bg-brand/10 text-text-primary"
                        : "border-border-strong text-text-secondary hover:border-text-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={subjectIds.includes(subject.id)}
                      onChange={() => toggleSubjectId(subject.id)}
                      className="sr-only"
                    />
                    {subject.name}
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
        )}

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
