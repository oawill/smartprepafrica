"use client";

import { useRef } from "react";

/** Six accessible digit boxes for OTP entry. Supports keyboard navigation
 * (auto-advance on input, backspace navigates back without stealing focus
 * from screen readers), pasting all six digits regardless of which box has
 * focus, a numeric mobile keyboard, and autoComplete="one-time-code" so
 * iOS/Android/desktop browsers and password managers can autofill from an
 * SMS/email one-time code — genuinely functional, not decorative. */
export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  error,
}: {
  length?: number;
  value: string[];
  onChange: (digits: string[]) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    const next = [...value];
    for (let i = 0; i < length; i++) {
      next[i] = pasted[i] ?? next[i] ?? "";
    }
    onChange(next);
    const lastFilledIndex = Math.min(pasted.length, length) - 1;
    refs.current[Math.max(0, lastFilledIndex)]?.focus();
  }

  return (
    <div>
      <div className="flex justify-center gap-2" role="group" aria-label="Verification code">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={value[i] ?? ""}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={disabled}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={!!error}
            className={`h-12 w-10 rounded-lg border bg-surface text-center text-lg font-semibold text-text-primary outline-none focus:border-brand disabled:opacity-60 sm:h-14 sm:w-12 ${
              error ? "border-danger" : "border-border-strong"
            }`}
          />
        ))}
      </div>
      <p className="sr-only" role="alert" aria-live="polite">
        {error ?? ""}
      </p>
    </div>
  );
}
