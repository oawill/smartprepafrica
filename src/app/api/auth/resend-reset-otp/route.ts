import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashIp } from "@/lib/partners/attribution";
import { logAudit } from "@/lib/admin/audit";
import { isEmailConfigured } from "@/lib/email";
import {
  isIpRateLimited,
  isAccountRateLimited,
  isUnderResendCooldown,
  issueAndSendOtp,
} from "@/lib/password-reset";

const schema = z.object({ email: z.string().trim().email() });

const GENERIC_MESSAGE = "If an account exists for this email, we've sent a password reset code.";
const COOLDOWN_MESSAGE = "Please wait before requesting another code.";

export async function POST(request: Request) {
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Unable to send code; please try again." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const ipHash = hashIp(request.headers.get("x-forwarded-for"));

  if (await isIpRateLimited(ipHash)) {
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true },
  });

  // Same reasoning as forgot-password/route.ts: a null passwordHash is
  // a legitimate Door 1 phone-only account, not "no account."
  if (!user) {
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }

  // The 60-second cooldown is safe to surface distinctly (spec
  // requirement): it only fires when a live token already exists, i.e.
  // only ever for a real account that has already been told "we sent a
  // code" — it doesn't add a new existence signal beyond what step 1
  // already established for this session.
  if (await isUnderResendCooldown(user.id)) {
    return NextResponse.json({ error: COOLDOWN_MESSAGE }, { status: 429 });
  }

  if (await isAccountRateLimited(user.id)) {
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }

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
