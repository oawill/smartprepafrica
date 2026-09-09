import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIp } from "@/lib/partners/attribution";
import { isIpRateLimited, isPhoneRateLimited, isUnderResendCooldown, issueAndSendOtp } from "@/lib/phone-otp";

const schema = z.object({ phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Enter a valid phone number in international format, e.g. +2348012345678.") });

// Always the same shape regardless of outcome (rate-limited, cooldown,
// or a real send) — the client can't distinguish any of these from each
// other, keeping the abuse surface identical either way (same
// reasoning as /api/auth/forgot-password's GENERIC_MESSAGE).
const GENERIC_MESSAGE = "If that number can receive a code, we've sent it.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter a valid phone number." }, { status: 400 });
  }
  const { phone } = parsed.data;

  const ipHash = hashIp(request.headers.get("x-forwarded-for"));

  if (await isIpRateLimited(ipHash)) {
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }
  if (await isPhoneRateLimited(phone)) {
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }
  if (await isUnderResendCooldown(phone)) {
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }

  await issueAndSendOtp(phone, ipHash);

  return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
}
