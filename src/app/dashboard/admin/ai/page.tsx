import Link from "next/link";
import { redirect } from "next/navigation";
import type { SubscriptionPlan } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { PLAN_LABELS } from "@/lib/plans";
import { updatePlanLimit } from "@/app/dashboard/admin/ai/actions";

function formatNairaFromKobo(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(kobo / 100);
}

const ALL_PLANS: SubscriptionPlan[] = ["FREE", "BASIC", "PREMIUM", "SCHOOL"];

export default async function AdminAiDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    activeUsers,
    totalRequests,
    requestsToday,
    requestsThisMonth,
    tokenTotals,
    errorCount,
    blockedCount,
    conversationsBySubject,
    conversationsByLesson,
    assistantMessages,
    planLimits,
    allUsageLogs,
  ] = await Promise.all([
    prisma.aiUsageLog.findMany({
      where: { feature: "coach_chat", createdAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.aiUsageLog.count({ where: { feature: "coach_chat" } }),
    prisma.aiUsageLog.count({ where: { feature: "coach_chat", createdAt: { gte: startOfDay } } }),
    prisma.aiUsageLog.count({ where: { feature: "coach_chat", createdAt: { gte: startOfMonth } } }),
    prisma.aiUsageLog.aggregate({
      where: { feature: "coach_chat" },
      _sum: { inputTokens: true, outputTokens: true, estimatedCostKobo: true },
    }),
    prisma.aiUsageLog.count({ where: { feature: "coach_chat_error" } }),
    prisma.aiUsageLog.count({ where: { feature: "coach_chat_blocked" } }),
    prisma.aiConversation.groupBy({
      by: ["subjectId"],
      where: { subjectId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { subjectId: "desc" } },
      take: 5,
    }),
    prisma.aiConversation.groupBy({
      by: ["lessonId"],
      where: { lessonId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { lessonId: "desc" } },
      take: 5,
    }),
    prisma.aiMessage.findMany({
      where: { role: "ASSISTANT" },
      select: { metadata: true },
    }),
    prisma.aiPlanLimit.findMany(),
    prisma.aiUsageLog.findMany({
      where: { feature: "coach_chat" },
      select: { userId: true },
    }),
  ]);

  const [subjectNames, lessonTitles] = await Promise.all([
    prisma.subject.findMany({
      where: { id: { in: conversationsBySubject.map((c) => c.subjectId!) } },
      select: { id: true, name: true },
    }),
    prisma.lesson.findMany({
      where: { id: { in: conversationsByLesson.map((c) => c.lessonId!) } },
      select: { id: true, title: true, topic: true },
    }),
  ]);
  const subjectNameById = new Map(subjectNames.map((s) => [s.id, s.name]));
  const lessonById = new Map(lessonTitles.map((l) => [l.id, l]));

  const ratings = assistantMessages
    .map((m) => (m.metadata as { rating?: number } | null)?.rating)
    .filter((r): r is number => typeof r === "number");
  const avgRating =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null;
  const thumbsUp = ratings.filter((r) => r === 1).length;
  const thumbsDown = ratings.filter((r) => r === -1).length;

  const uniqueUserIds = [...new Set(allUsageLogs.map((l) => l.userId))];
  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId: { in: uniqueUserIds },
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { userId: true, plan: true },
    orderBy: { startedAt: "desc" },
  });
  const planByUser = new Map<string, SubscriptionPlan>();
  for (const s of subscriptions) {
    if (!planByUser.has(s.userId)) planByUser.set(s.userId, s.plan);
  }
  const usageByPlan = new Map<SubscriptionPlan, number>();
  for (const log of allUsageLogs) {
    const plan = planByUser.get(log.userId) ?? "FREE";
    usageByPlan.set(plan, (usageByPlan.get(plan) ?? 0) + 1);
  }

  const totalTokens = (tokenTotals._sum.inputTokens ?? 0) + (tokenTotals._sum.outputTokens ?? 0);

  return (
    <div>
      <Link href="/dashboard/admin" className="text-sm text-slate-400 hover:text-white">
        ← Admin dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">AI Study Coach</h1>
      <p className="mt-1 text-sm text-slate-400">
        Usage, cost, and quality analytics. Individual conversation content is never shown here.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Active AI users (30d)">
          <p className="text-3xl font-semibold">{activeUsers.length}</p>
        </Card>
        <Card title="Total requests">
          <p className="text-3xl font-semibold">{totalRequests}</p>
        </Card>
        <Card title="Requests today">
          <p className="text-3xl font-semibold">{requestsToday}</p>
        </Card>
        <Card title="Requests this month">
          <p className="text-3xl font-semibold">{requestsThisMonth}</p>
        </Card>
        <Card title="Token consumption">
          <p className="text-3xl font-semibold">{totalTokens.toLocaleString()}</p>
          <p className="text-xs text-slate-500">
            {(tokenTotals._sum.inputTokens ?? 0).toLocaleString()} in ·{" "}
            {(tokenTotals._sum.outputTokens ?? 0).toLocaleString()} out
          </p>
        </Card>
        <Card title="Estimated AI cost">
          <p className="text-3xl font-semibold">
            {formatNairaFromKobo(tokenTotals._sum.estimatedCostKobo ?? 0)}
          </p>
          <p className="text-xs text-slate-500">Rough estimate, not a billing record.</p>
        </Card>
        <Card title="Average response rating">
          <p className="text-3xl font-semibold">
            {avgRating !== null ? avgRating.toFixed(2) : "—"}
          </p>
          <p className="text-xs text-slate-500">
            {thumbsUp} 👍 · {thumbsDown} 👎 ({ratings.length} rated)
          </p>
        </Card>
        <Card title="Errors / blocked">
          <p className="text-3xl font-semibold">
            {errorCount} / {blockedCount}
          </p>
          <p className="text-xs text-slate-500">Stream errors / usage-limit blocks</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Most used subjects">
          {conversationsBySubject.length === 0 ? (
            <p className="text-sm text-slate-400">No subject-linked conversations yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {conversationsBySubject.map((c) => (
                <li key={c.subjectId} className="flex justify-between text-slate-300">
                  <span>{subjectNameById.get(c.subjectId!) ?? "Unknown"}</span>
                  <span className="text-slate-500">{c._count._all} conversations</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Most asked-about lessons">
          {conversationsByLesson.length === 0 ? (
            <p className="text-sm text-slate-400">No lesson-linked conversations yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {conversationsByLesson.map((c) => {
                const lesson = lessonById.get(c.lessonId!);
                return (
                  <li key={c.lessonId} className="flex justify-between text-slate-300">
                    <span>{lesson?.title ?? "Unknown"}{lesson?.topic ? ` — ${lesson.topic}` : ""}</span>
                    <span className="text-slate-500">{c._count._all} conversations</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Usage by subscription plan">
          <ul className="space-y-1.5 text-sm">
            {ALL_PLANS.map((plan) => (
              <li key={plan} className="flex justify-between text-slate-300">
                <span>{PLAN_LABELS[plan]}</span>
                <span className="text-slate-500">{usageByPlan.get(plan) ?? 0} requests</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Daily message limits by plan">
          <div className="space-y-3">
            {ALL_PLANS.map((plan) => {
              const current = planLimits.find((l) => l.plan === plan)?.dailyMessageLimit;
              return (
                <form
                  key={plan}
                  action={updatePlanLimit}
                  className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                >
                  <input type="hidden" name="plan" value={plan} />
                  <span className="w-20 text-sm text-slate-300">{PLAN_LABELS[plan]}</span>
                  <input
                    type="number"
                    name="dailyMessageLimit"
                    min={0}
                    defaultValue={current ?? ""}
                    placeholder="not set"
                    className="w-28 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm outline-none focus:border-orange-500"
                  />
                  <span className="text-xs text-slate-500">messages / day</span>
                  <button
                    type="submit"
                    className="ml-auto rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-500"
                  >
                    Save
                  </button>
                </form>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
