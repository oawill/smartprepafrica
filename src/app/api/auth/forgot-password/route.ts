import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashIp } from "@/lib/partners/attribution";
import { logAudit } from "@/lib/admin/audit";
import { isEmailConfigured } from "@/lib/email";
import { isIpRateLimited, isAccountRateLimited, issueAndSendOtp } from "@/lib/password-reset";

const schema = z.object({ email: z.string().trim().email() });

// Identical response for every outcome (unknown email, rate-limited, no
// password set, or a real send) — never reveal whether an account exists.
const GENERIC_MESSAGE = "If an account exists for this email, we've sent a password reset code.";

export async function POST(request: Request) {
  // A global "is email even configured" check is safe to surface distinctly
  // — it's evaluated identically for every request regardless of the email
  // submitted, so it can never become an account-existence oracle. A
  // per-account send failure (e.g. one specific Resend error) is NOT
  // surfaced distinctly below, for exactly that reason — see the comment
  // near issueAndSendOtp's call site.
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Unable to send code; please try again." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const ipHash = hashIp(request.headers.get("x-forwarded-for"));

  // IP rate-limit is checked unconditionally, before any user lookup —
  // this is the actual defense against enumeration-by-volume, so it must
  // never be skipped just because a given email turns out not to exist.
  if (await isIpRateLimited(ipHash)) {
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }

  if (await isAccountRateLimited(user.id)) {
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }

  // A failure here (e.g. the sending domain isn't DNS-verified yet) is
  // deliberately NOT surfaced to the requester with a different response
  // — doing so would only ever happen for a real account, which leaks
  // existence. Instead it's recorded for operators to notice via the
  // audit log; the user sees the same generic message either way.
  const { sent } = await issueAndSendOtp(user.id, user.email, ipHash);
  if (!sent) {
    await logAudit({
      actorUserId: user.id,
      action: "PASSWORD_RESET_EMAIL_SEND_FAILED",
      resourceType: "PasswordResetToken",
      result: "FAILURE",
    });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
}
