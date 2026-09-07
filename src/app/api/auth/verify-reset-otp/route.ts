import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/password-reset";

const schema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

const GENERIC_ERROR = "Invalid or expired code.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? GENERIC_ERROR }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  // No live token for a nonexistent user reads identically to "no live
  // token" for a real one that never requested a reset — same generic
  // failure either way, never distinguishing.
  if (!user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const result = await verifyOtp(user.id, parsed.data.otp);

  if (result === "VALID") {
    return NextResponse.json({ message: "Code verified." }, { status: 200 });
  }

  if (result === "LOCKED") {
    return NextResponse.json(
      { error: "Too many attempts. Please request a new code." },
      { status: 429 }
    );
  }

  // INVALID or EXPIRED_OR_MISSING — identical generic message either way.
  return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
}
