/** SmartPrepAfrica's password policy — registration only enforces HTML5
 * minLength={8} today with no shared utility; this is the first reusable
 * policy definition, applied to both registration's minimum and the new
 * password-reset flow. Exported as individual rules (not just a single
 * pass/fail) so the UI can render a live per-rule checklist. */
export type PasswordRule = {
  key: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "uppercase", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "lowercase", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
];

export function passwordMeetsPolicy(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function firstPasswordPolicyFailure(password: string): string | null {
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
  return failed
    ? `Password must contain: ${PASSWORD_RULES.map((r) => r.label.toLowerCase()).join(", ")}.`
    : null;
}
