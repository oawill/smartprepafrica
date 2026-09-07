import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/admin/audit";
import { getVerifiedLiveToken } from "@/lib/password-reset";
import { passwordMeetsPolicy, firstPasswordPolicyFailure } from "@/lib/password-policy";

const schema = z
  .object({
    email: z.string().trim().email(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const GENERIC_SESSION_ERROR = "Invalid or expired session. Please request a new code.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const { email, newPassword } = parsed.data;

  if (!passwordMeetsPolicy(newPassword)) {
    return NextResponse.json({ error: firstPasswordPolicyFailure(newPassword) }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: GENERIC_SESSION_ERROR }, { status: 400 });
  }

  const token = await getVerifiedLiveToken(user.id);
  if (!token) {
    return NextResponse.json({ error: GENERIC_SESSION_ERROR }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        // Bumping sessionVersion forces every other live session to
        // re-authenticate on its next request — src/lib/auth.ts's JWT
        // callback re-checks this against the DB every time it runs.
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await logAudit({
    actorUserId: user.id,
    action: "PASSWORD_RESET_COMPLETED",
    resourceType: "User",
    resourceId: user.id,
    result: "SUCCESS",
  });

  return NextResponse.json(
    { message: "Password reset successful. You can now sign in with your new password." },
    { status: 200 }
  );
}
