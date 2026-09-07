import { randomInt, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const IP_RATE_LIMIT_WINDOW_MIN = 15;
const IP_RATE_LIMIT_MAX = 5; // requests per IP per window, across all emails
const EMAIL_RATE_LIMIT_WINDOW_MIN = 15;
const EMAIL_RATE_LIMIT_MAX = 3; // requests per account per window

/** Cryptographically secure 6-digit OTP, zero-padded (e.g. "004821"). */
export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

/** Deliberately SHA-256, not bcrypt — see the schema comment on
 * PasswordResetToken for why a fast hash is correct for a short-lived,
 * attempt-capped, server-generated numeric code. */
export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

/** IP-hash rate limit — checked unconditionally, before any user lookup,
 * since this is the real defense against enumeration-by-volume and must
 * never be skipped just because a given email doesn't exist. */
export async function isIpRateLimited(ipHash: string | null): Promise<boolean> {
  if (!ipHash) return false;
  const windowStart = new Date(Date.now() - IP_RATE_LIMIT_WINDOW_MIN * 60 * 1000);
  const count = await prisma.passwordResetToken.count({
    where: { ipHash, createdAt: { gte: windowStart } },
  });
  return count >= IP_RATE_LIMIT_MAX;
}

/** Per-account rate limit — only checked once a user is confirmed to
 * exist (an unconditional per-email count would itself be an enumeration
 * oracle, since a nonexistent email could never trip it). */
export async function isAccountRateLimited(userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - EMAIL_RATE_LIMIT_WINDOW_MIN * 60 * 1000);
  const count = await prisma.passwordResetToken.count({
    where: { userId, createdAt: { gte: windowStart } },
  });
  return count >= EMAIL_RATE_LIMIT_MAX;
}

/** The currently-live token for a user, if any. After invalidation-on-
 * reissue there's only ever at most one; orderBy is a defensive fallback,
 * not something normal operation should need. */
export async function getLiveToken(userId: string) {
  return prisma.passwordResetToken.findFirst({
    where: { userId, usedAt: null, invalidatedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

/** True if the user's live token (if any) was issued under the resend
 * cooldown window. */
export async function isUnderResendCooldown(userId: string): Promise<boolean> {
  const live = await getLiveToken(userId);
  if (!live) return false;
  return Date.now() - live.createdAt.getTime() < RESEND_COOLDOWN_MS;
}

/** Invalidates any currently-live token for this user, then creates a
 * fresh one. Returns the RAW otp (never persisted) so the caller can
 * email it — this is the only place in the codebase the raw code exists,
 * and it must never be logged. */
export async function createResetToken(userId: string, ipHash: string | null) {
  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null, invalidatedAt: null },
      data: { invalidatedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        otpHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        ipHash,
      },
    }),
  ]);

  return otp;
}

export type VerifyOtpResult = "VALID" | "INVALID" | "EXPIRED_OR_MISSING" | "LOCKED";

/** Checks a submitted OTP against the user's live token. Increments
 * attempts on any mismatch and locks the token out (invalidatedAt) once
 * maxAttempts is reached — the caller must treat every non-"VALID" result
 * identically in user-facing copy ("invalid or expired code"), never
 * revealing which specific reason applied. */
export async function verifyOtp(userId: string, submittedOtp: string): Promise<VerifyOtpResult> {
  const live = await getLiveToken(userId);
  if (!live) return "EXPIRED_OR_MISSING";

  if (hashOtp(submittedOtp) === live.otpHash) {
    await prisma.passwordResetToken.update({
      where: { id: live.id },
      data: { verifiedAt: new Date() },
    });
    return "VALID";
  }

  const attempts = live.attempts + 1;
  const lockedOut = attempts >= live.maxAttempts;
  await prisma.passwordResetToken.update({
    where: { id: live.id },
    data: { attempts, invalidatedAt: lockedOut ? new Date() : undefined },
  });
  return lockedOut ? "LOCKED" : "INVALID";
}

/** The token that gates reset-password: must be live AND already
 * OTP-verified. */
export async function getVerifiedLiveToken(userId: string) {
  return prisma.passwordResetToken.findFirst({
    where: {
      userId,
      usedAt: null,
      invalidatedAt: null,
      expiresAt: { gt: new Date() },
      verifiedAt: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Marks the token fully dead once the password has actually been
 * changed with it — distinct from invalidatedAt (superseded/locked-out)
 * so audit queries can always tell the two apart. */
export async function consumeToken(tokenId: string) {
  await prisma.passwordResetToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  });
}

/** Generates a fresh OTP, persists it (invalidating any prior live one),
 * and emails it — the shared core of both /forgot-password and
 * /resend-reset-otp. Returns whether the email actually sent, so the
 * caller can surface "Unable to send code; please try again" without
 * ever having created a token the user has no way to receive... except
 * the token IS already created before the send attempt, which is
 * intentional: a transient email-provider failure shouldn't force the
 * user through rate-limiting again immediately if they retry resend. */
export async function issueAndSendOtp(
  userId: string,
  email: string,
  ipHash: string | null
): Promise<{ sent: boolean }> {
  const otp = await createResetToken(userId, ipHash);
  const { subject, html } = buildPasswordResetOtpEmail(otp);
  const result = await sendEmail({
    to: email,
    subject,
    html,
    idempotencyKey: `password-reset-otp/${userId}/${Date.now()}`,
  });
  return { sent: result.ok };
}

export function buildPasswordResetOtpEmail(otp: string): { subject: string; html: string } {
  const subject = "SmartPrepAfrica Password Reset Code";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
      <p style="font-size: 15px; font-weight: 600; color: #ea580c; margin: 0 0 24px;">SmartPrepAfrica</p>
      <p style="font-size: 15px; line-height: 1.6;">Hello,</p>
      <p style="font-size: 15px; line-height: 1.6;">We received a request to reset your SmartPrepAfrica password.</p>
      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 8px;">Your verification code is:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 16px 0; text-align: center; background: #f5f5f5; border-radius: 8px; padding: 16px;">${otp}</p>
      <p style="font-size: 14px; line-height: 1.6; color: #555;">This code expires in 10 minutes.</p>
      <p style="font-size: 14px; line-height: 1.6; color: #555;">If you did not request a password reset, you can safely ignore this email.</p>
      <p style="font-size: 14px; margin-top: 32px; color: #999;">SmartPrepAfrica</p>
    </div>
  `.trim();
  return { subject, html };
}
