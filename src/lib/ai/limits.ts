import type { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Defaults used the first time a plan's limit is looked up — admins can
 * change these afterward via the admin AI dashboard (AiPlanLimit rows).
 * Free/Basic/School are scaled 30x from their former daily caps (5/15/50)
 * to preserve the same generosity under a monthly window. Premium is set
 * per the pricing spec (50 AI Tutor sessions/month). Pro's "unlimited"
 * marketing claim is backed by a high fair-use ceiling, not a true
 * unlimited value, and is admin-adjustable like every other plan. */
export const DEFAULT_MONTHLY_LIMITS: Record<SubscriptionPlan, number> = {
  FREE: 150,
  BASIC: 450,
  PREMIUM: 50,
  PRO: 2000,
  SCHOOL: 1500,
};

/** Start of the calendar month containing `date`, local time. Pure so the
 * monthly-window boundary logic can be unit-tested without a database. */
export function getStartOfCalendarMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

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

export async function getMonthlyLimitForPlan(plan: SubscriptionPlan): Promise<number> {
  const row = await prisma.aiPlanLimit.upsert({
    where: { plan },
    update: {},
    create: {
      plan,
      dailyMessageLimit: DEFAULT_MONTHLY_LIMITS[plan],
      monthlyMessageLimit: DEFAULT_MONTHLY_LIMITS[plan],
    },
  });
  return row.monthlyMessageLimit ?? DEFAULT_MONTHLY_LIMITS[plan];
}

export async function getThisMonthMessageCount(userId: string): Promise<number> {
  const startOfMonth = getStartOfCalendarMonth(new Date());

  return prisma.aiUsageLog.count({
    where: { userId, feature: "coach_chat", createdAt: { gte: startOfMonth } },
  });
}

export type UsageCheck = { allowed: boolean; used: number; limit: number; plan: SubscriptionPlan };

export async function checkUsageAllowance(userId: string): Promise<UsageCheck> {
  const plan = await getUserPlan(userId);
  const [limit, used] = await Promise.all([
    getMonthlyLimitForPlan(plan),
    getThisMonthMessageCount(userId),
  ]);
  return { allowed: used < limit, used, limit, plan };
}
