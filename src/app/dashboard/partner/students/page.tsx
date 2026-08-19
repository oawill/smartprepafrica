import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";

export default async function PartnerStudentsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PARTNER") redirect("/dashboard");

  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner || partner.status !== "APPROVED") redirect("/dashboard/partner");

  const referrals = await prisma.partnerReferral.findMany({
    where: { partnerId: partner.id, status: "REGISTERED" },
    include: {
      user: { select: { name: true, createdAt: true } },
      campaign: { select: { name: true, slug: true } },
    },
    orderBy: { registeredAt: "desc" },
  });

  const paidUserIds = new Set(
    (
      await prisma.partnerCommission.findMany({
        where: {
          partnerId: partner.id,
          eventType: "STUDENT_FIRST_SUBSCRIPTION",
          status: { in: ["QUALIFIED", "APPROVED", "AVAILABLE", "PAID"] },
        },
        select: { sourceUserId: true },
      })
    )
      .map((c) => c.sourceUserId)
      .filter((id): id is string => !!id)
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">My students</h1>
      <p className="mt-1 text-sm text-slate-400">
        Everyone who registered through your referral link. Only the information you need to
        track your referrals is shown here — no academic records or private details.
      </p>

      <div className="mt-6">
        <Card title={`${referrals.length} referred student${referrals.length === 1 ? "" : "s"}`}>
          {referrals.length === 0 ? (
            <p className="text-sm text-slate-400">No students referred yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Registered</th>
                  <th className="pb-2">Campaign</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800">
                    <td className="py-2">{r.user?.name ?? "—"}</td>
                    <td className="py-2 text-slate-400">
                      {r.registeredAt
                        ? new Date(r.registeredAt).toLocaleDateString("en-NG")
                        : "—"}
                    </td>
                    <td className="py-2 text-slate-400">{r.campaign?.name ?? "Direct"}</td>
                    <td className="py-2">
                      {r.userId && paidUserIds.has(r.userId) ? (
                        <span className="text-green-400">Paid</span>
                      ) : (
                        <span className="text-slate-500">Registered</span>
                      )}
                    </td>
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
