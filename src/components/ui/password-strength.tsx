"use client";

import { PASSWORD_RULES } from "@/lib/password-policy";

/** Live per-rule checklist against SmartPrepAfrica's password policy — no
 * such component exists elsewhere in the app; registration only has a
 * plain HTML5 minLength today. */
export function PasswordStrength({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1 text-xs">
      {PASSWORD_RULES.map((rule) => {
        const met = password.length > 0 && rule.test(password);
        return (
          <li
            key={rule.key}
            className={`flex items-center gap-1.5 ${met ? "text-success" : "text-text-muted"}`}
          >
            <span aria-hidden="true">{met ? "✓" : "○"}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
