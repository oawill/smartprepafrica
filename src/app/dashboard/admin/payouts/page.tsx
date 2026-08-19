import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { formatNaira } from "@/lib/partners/compensation";
import { approvePayout, markPayoutPaid, rejectPayout } from "@/app/dashboard/admin/payouts/actions";

export default async function AdminPayoutsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const payouts = await prisma.partnerPayout.findMany({
    where: { status: { in: ["REQUESTED", "APPROVED"] } },
    include: { partner: { select: { firstName: true, lastName: true, partnerNumber: true } } },
    orderBy: { requestedAt: "asc" },
  });

  const recent = await prisma.partnerPayout.findMany({
    where: { status: { in: ["PAID", "REJECTED"] } },
    include: { partner: { select: { firstName: true, lastName: true, partnerNumber: true } } },
    orderBy: { requestedAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Partner payouts</h1>
      <p className="mt-1 text-sm text-slate-400">
        Review and process payout requests. Payouts are only marked paid once you confirm the
        transfer actually happened.
      </p>

      <div className="mt-6">
        <Card title={`Pending (${payouts.length})`}>
          {payouts.length === 0 ? (
            <p className="text-sm text-slate-400">No pending payout requests.</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-800 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {p.payoutNumber} · {formatNaira(p.amountKobo)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.partner.firstName} {p.partner.lastName} ({p.partner.partnerNumber}) ·{" "}
                        {p.method}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-amber-400">
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.status === "REQUESTED" && (
                      <form action={approvePayout}>
                        <input type="hidden" name="payoutId" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-blue-800 px-3 py-1 text-xs text-blue-400 hover:border-blue-600"
                        >
                          Approve
                        </button>
                      </form>
                    )}
                    {p.status === "APPROVED" && (
                      <form action={markPayoutPaid}>
                        <input type="hidden" name="payoutId" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-green-800 px-3 py-1 text-xs text-green-400 hover:border-green-600"
                        >
                          Mark paid
                        </button>
                      </form>
                    )}
                    <form action={rejectPayout} className="flex items-center gap-2">
                      <input type="hidden" name="payoutId" value={p.id} />
                      <input
                        name="reason"
                        placeholder="Rejection reason"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-orange-500"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-900 px-3 py-1 text-xs text-red-400 hover:border-red-700"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Recent history">
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400">No processed payouts yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-2">Payout</th>
                  <th className="pb-2">Partner</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className="border-t border-slate-800">
                    <td className="py-2 font-mono text-xs">{p.payoutNumber}</td>
                    <td className="py-2 text-slate-400">
                      {p.partner.firstName} {p.partner.lastName}
                    </td>
                    <td className="py-2">{formatNaira(p.amountKobo)}</td>
                    <td className="py-2">
                      <span className={p.status === "PAID" ? "text-green-400" : "text-red-400"}>
                        {p.status}
                      </span>
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
