import { prisma } from "@/lib/prisma";

/** Records every login attempt, success or failure. Never pass a password,
 * OTP, token, or other secret into `failureReason` — only short machine
 * codes like "BAD_PASSWORD" or "ACCOUNT_SUSPENDED". */
export async function logLoginActivity(params: {
  userId?: string | null;
  email: string;
  success: boolean;
  failureReason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const { hashIp } = await import("@/lib/partners/attribution");
  await prisma.loginActivity.create({
    data: {
      userId: params.userId ?? undefined,
      email: params.email,
      success: params.success,
      failureReason: params.failureReason ?? undefined,
      ipHash: hashIp(params.ip ?? null) ?? undefined,
      userAgent: params.userAgent?.slice(0, 500) ?? undefined,
    },
  });
}
