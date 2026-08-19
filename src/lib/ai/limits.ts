import type { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Defaults used the first time a plan's limit is looked up — admins can
 * change these afterward via the admin AI dashboard (AiPlanLimit rows). */
const DEFAULT_DAILY_LIMITS: Record<SubscriptionPlan, number> = {
  FREE: 5,
  BASIC: 15,
  PREMIUM: 100,
  SCHOOL: 50,
};

/** Mirrors the ACTIVE-subscription lookup already used on the pricing page,
 * with an added defensive check against a stale ACTIVE row past its
 * expiresAt (some flows lazily flip status to EXPIRED rather than eagerly). */
export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { startedAt: "desc" },
    select: { plan: true },
  });
  return subscription?.plan ?? "FREE";
}

export async function getDailyLimitForPlan(plan: SubscriptionPlan): Promise<number> {
  const row = await prisma.aiPlanLimit.upsert({
    where: { plan },
    update: {},
    create: { plan, dailyMessageLimit: DEFAULT_DAILY_LIMITS[plan] },
  });
  return row.dailyMessageLimit;
}

export async function getTodayMessageCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.aiUsageLog.count({
    where: { userId, feature: "coach_chat", createdAt: { gte: startOfDay } },
  });
}

export type UsageCheck = { allowed: boolean; used: number; limit: number; plan: SubscriptionPlan };

export async function checkUsageAllowance(userId: string): Promise<UsageCheck> {
  const plan = await getUserPlan(userId);
  const [limit, used] = await Promise.all([
    getDailyLimitForPlan(plan),
    getTodayMessageCount(userId),
  ]);
  return { allowed: used < limit, used, limit, plan };
}
