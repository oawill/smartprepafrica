import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { formatNaira } from "@/lib/partners/compensation";
import { getPartnerSettings } from "@/lib/partners/settings";
import { requestPayout } from "@/app/dashboard/partner/payouts/actions";

const statusColor: Record<string, string> = {
  REQUESTED: "text-amber-400",
  APPROVED: "text-blue-400",
  PAID: "text-green-400",
  REJECTED: "text-red-400",
  CANCELLED: "text-slate-500",
};

export default async function PartnerPayoutsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PARTNER") redirect("/dashboard");

  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner || partner.status !== "APPROVED") redirect("/dashboard/partner");

  const settings = await getPartnerSettings();

  const [availableAgg, payouts] = await Promise.all([
    prisma.partnerCommission.aggregate({
      where: { partnerId: partner.id, status: "AVAILABLE", payoutId: null },
      _sum: { amountKobo: true },
    }),
    prisma.partnerPayout.findMany({
      where: { partnerId: partner.id },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  const availableKobo = availableAgg._sum.amountKobo ?? 0;
  const canRequest = availableKobo >= settings.minimumPayoutKobo;
  const hasPendingRequest = payouts.some((p) => p.status === "REQUESTED" || p.status === "APPROVED");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Payouts</h1>

      <div className="mt-6">
        <Card title="Request a payout">
          <p className="text-sm text-slate-400">
            Available balance: <span className="text-slate-200">{formatNaira(availableKobo)}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Minimum payout: {formatNaira(settings.minimumPayoutKobo)}
          </p>

          {hasPendingRequest ? (
            <p className="mt-3 text-sm text-amber-400">
              You already have a payout request being processed.
            </p>
          ) : (
            <form action={requestPayout} className="mt-3">
              <input type="hidden" name="method" value={partner.preferredPaymentMethod ?? "BANK_TRANSFER"} />
              <button
                type="submit"
                disabled={!canRequest}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Request payout
              </button>
              {!canRequest && (
                <p className="mt-2 text-xs text-slate-500">
                  You need at least {formatNaira(settings.minimumPayoutKobo)} available.
                </p>
              )}
            </form>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Payout history">
          {payouts.length === 0 ? (
            <p className="text-sm text-slate-400">No payouts requested yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-2">Payout</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Requested</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-slate-800">
                    <td className="py-2 font-mono text-xs">{p.payoutNumber}</td>
                    <td className="py-2">{formatNaira(p.amountKobo)}</td>
                    <td className="py-2 text-slate-400">{p.method}</td>
                    <td className={`py-2 ${statusColor[p.status] ?? ""}`}>{p.status}</td>
                    <td className="py-2 text-slate-400">
                      {new Date(p.requestedAt).toLocaleDateString("en-NG")}
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
