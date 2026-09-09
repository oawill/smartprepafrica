import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PLAN_LABELS } from "@/lib/plans";

const schema = z.object({ code: z.string().trim().min(1) });

/** Read-only preflight for the register form's "Have a sponsor code?"
 * step — shows the plan the code grants before the rest of the form
 * commits to it. Registration itself re-validates independently via
 * redeemVoucherRecord (see create-student-account.ts), so this endpoint
 * has no side effects and needs no rate limiting: a wrong code just
 * fails to resolve a plan name, and a voucher code is a long random
 * string, not brute-forceable — same reasoning as the school-join
 * lookup endpoint. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a sponsor code." }, { status: 400 });
  }

  const code = parsed.data.code.toUpperCase();
  const voucher = await prisma.voucher.findUnique({ where: { code } });
  const isValid = voucher && voucher.status === "ACTIVE" && (!voucher.expiresAt || voucher.expiresAt > new Date());

  if (!isValid) {
    return NextResponse.json({ error: "Invalid or expired sponsor code." }, { status: 400 });
  }

  return NextResponse.json({ planLabel: PLAN_LABELS[voucher.plan] }, { status: 200 });
}
