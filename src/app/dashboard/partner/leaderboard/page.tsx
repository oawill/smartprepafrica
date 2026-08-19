import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { getPartnerSettings } from "@/lib/partners/settings";
import { countQualifiedPaidStudents, computeTierForPartner } from "@/lib/partners/compensation";

export default async function PartnerLeaderboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PARTNER") redirect("/dashboard");

  const settings = await getPartnerSettings();
  if (!settings.leaderboardEnabled) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <p className="mt-2 text-sm text-slate-400">The leaderboard is currently disabled.</p>
      </div>
    );
  }

  const currentPartner = await prisma.partner.findUnique({ where: { userId: session.user.id } });

  const partners = await prisma.partner.findMany({
    where: { status: "APPROVED", hideFromLeaderboard: false },
  });

  const ranked = (
    await Promise.all(
      partners.map(async (p) => ({
        partner: p,
        paidStudents: await countQualifiedPaidStudents(p.id),
        tier: await computeTierForPartner(p.id),
      }))
    )
  )
    .sort((a, b) => b.paidStudents - a.paidStudents)
    .slice(0, 50);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Partner leaderboard</h1>
      <p className="mt-1 text-sm text-slate-400">
        Ranked by paid students referred. You can hide yourself from this list in your profile.
      </p>

      <div className="mt-6">
        <Card title="Top partners">
          {ranked.length === 0 ? (
            <p className="text-sm text-slate-400">No partners on the leaderboard yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-2">#</th>
                  <th className="pb-2">Partner</th>
                  <th className="pb-2">Tier</th>
                  <th className="pb-2">Paid students</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr
                    key={r.partner.id}
                    className={`border-t border-slate-800 ${r.partner.id === currentPartner?.id ? "bg-slate-800/40" : ""}`}
                  >
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2">
                      {r.partner.firstName} {r.partner.lastName.charAt(0)}.
                    </td>
                    <td className="py-2 text-slate-400">{r.tier?.name ?? "—"}</td>
                    <td className="py-2 font-semibold">{r.paidStudents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
