import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp } from "@/lib/otp";
import { getSmsProvider } from "@/lib/sms";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const IP_RATE_LIMIT_WINDOW_MIN = 15;
const IP_RATE_LIMIT_MAX = 5; // requests per IP per window, across all phones
const PHONE_RATE_LIMIT_WINDOW_MIN = 15;
const PHONE_RATE_LIMIT_MAX = 3; // requests per phone per window

/** IP-hash rate limit — checked unconditionally, before any per-phone
 * check, same reasoning as password-reset.ts's isIpRateLimited: this is
 * the real defense against enumeration-by-volume. */
export async function isIpRateLimited(ipHash: string | null): Promise<boolean> {
  if (!ipHash) return false;
  const windowStart = new Date(Date.now() - IP_RATE_LIMIT_WINDOW_MIN * 60 * 1000);
  const count = await prisma.phoneOtp.count({ where: { ipHash, createdAt: { gte: windowStart } } });
  return count >= IP_RATE_LIMIT_MAX;
}

/** Per-phone rate limit — unlike password-reset's per-account version,
 * this is checked unconditionally too: there's no existing-account
 * secret to protect for a phone number the way there is for an email
 * address, since phone signup creates the account on first use. */
export async function isPhoneRateLimited(phone: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - PHONE_RATE_LIMIT_WINDOW_MIN * 60 * 1000);
  const count = await prisma.phoneOtp.count({ where: { phone, createdAt: { gte: windowStart } } });
  return count >= PHONE_RATE_LIMIT_MAX;
}

/** The currently-live OTP for a phone, if any. After invalidation-on-
 * reissue there's only ever at most one; orderBy is a defensive
 * fallback, not something normal operation should need. */
export async function getLiveOtp(phone: string) {
  return prisma.phoneOtp.findFirst({
    where: { phone, consumedAt: null, invalidatedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export async function isUnderResendCooldown(phone: string): Promise<boolean> {
  const live = await getLiveOtp(phone);
  if (!live) return false;
  return Date.now() - live.createdAt.getTime() < RESEND_COOLDOWN_MS;
}

/** Invalidates any currently-live OTP for this phone, then creates a
 * fresh one. Returns the raw code (never persisted) so the caller can
 * send it — this is the only place in the codebase the raw code exists,
 * and it must never be logged outside the dev-only ConsoleSmsProvider. */
export async function createOtp(phone: string, ipHash: string | null) {
  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await prisma.$transaction([
    prisma.phoneOtp.updateMany({
      where: { phone, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: new Date() },
    }),
    prisma.phoneOtp.create({
      data: { phone, otpHash, expiresAt: new Date(Date.now() + OTP_TTL_MS), ipHash },
    }),
  ]);

  return otp;
}

export type VerifyPhoneOtpResult = "VALID" | "INVALID" | "EXPIRED_OR_MISSING" | "LOCKED";

/** Checks a submitted code against the phone's live OTP. Increments
 * attempts on any mismatch and locks it out (invalidatedAt) once
 * maxAttempts is reached. Deliberately does NOT mark anything consumed
 * on a VALID result — the caller (the NextAuth phone-otp provider) does
 * that itself once it actually uses the result to log in or register,
 * so the same code can't be replayed after a successful sign-in. */
export async function verifyOtp(phone: string, submittedOtp: string): Promise<VerifyPhoneOtpResult> {
  const live = await getLiveOtp(phone);
  if (!live) return "EXPIRED_OR_MISSING";

  if (hashOtp(submittedOtp) === live.otpHash) return "VALID";

  const attempts = live.attempts + 1;
  const lockedOut = attempts >= live.maxAttempts;
  await prisma.phoneOtp.update({
    where: { id: live.id },
    data: { attempts, invalidatedAt: lockedOut ? new Date() : undefined },
  });
  return lockedOut ? "LOCKED" : "INVALID";
}

/** Marks the phone's live OTP consumed once it has actually been used
 * to log in or register — called by the NextAuth provider after a
 * VALID verifyOtp result, never before. */
export async function consumeOtpForPhone(phone: string): Promise<void> {
  const live = await getLiveOtp(phone);
  if (!live) return;
  await prisma.phoneOtp.update({ where: { id: live.id }, data: { consumedAt: new Date() } });
}

/** Generates a fresh OTP, persists it (invalidating any prior live
 * one), and sends it via the configured SmsProvider — the shared core
 * of the /api/auth/phone/send-otp route. */
export async function issueAndSendOtp(phone: string, ipHash: string | null): Promise<{ sent: boolean }> {
  const otp = await createOtp(phone, ipHash);
  const result = await getSmsProvider().sendOtp(phone, otp);
  return { sent: result.ok };
}
