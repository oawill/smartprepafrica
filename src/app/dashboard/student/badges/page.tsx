import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { BADGE_CATALOG } from "@/lib/gamification/badges";

export default async function StudentBadgesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const earned = await prisma.userBadge.findMany({
    where: { userId: session.user.id },
    include: { badge: { select: { name: true } } },
  });
  const earnedByName = new Map(earned.map((e) => [e.badge.name, e.awardedAt]));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Badges</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {earned.length} of {BADGE_CATALOG.length} earned.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BADGE_CATALOG.map((badge) => {
          const awardedAt = earnedByName.get(badge.name);
          return (
            <Card key={badge.name} className={awardedAt ? undefined : "opacity-50"}>
              <p className="font-medium text-text-primary">{badge.name}</p>
              <p className="mt-1 text-sm text-text-secondary">{badge.description}</p>
              <p className="mt-3 text-xs text-text-muted">
                {awardedAt ? `Earned ${awardedAt.toLocaleDateString()}` : "Not earned yet"}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
