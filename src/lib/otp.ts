import { randomInt, createHash } from "node:crypto";

const OTP_LENGTH = 6;

/** Cryptographically secure 6-digit OTP, zero-padded (e.g. "004821").
 * Shared by every OTP flow (password reset, phone signup/login). */
export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

/** Deliberately SHA-256, not bcrypt — see the schema comment on
 * PasswordResetToken for why a fast hash is correct for a short-lived,
 * attempt-capped, server-generated numeric code. */
export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}
