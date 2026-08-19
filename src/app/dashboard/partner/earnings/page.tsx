import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { formatNaira } from "@/lib/partners/compensation";

type Period = "this_month" | "last_month" | "quarter" | "year" | "custom";

function resolveRange(period: Period, fromParam?: string, toParam?: string) {
  const now = new Date();
  if (period === "custom" && fromParam && toParam) {
    return { from: new Date(fromParam), to: new Date(toParam) };
  }
  if (period === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to };
  }
  if (period === "quarter") {
    const from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    return { from, to: now };
  }
  if (period === "year") {
    const from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return { from, to: now };
  }
  // this_month
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from, to: now };
}

const periodLabels: Record<Period, string> = {
  this_month: "This month",
  last_month: "Last month",
  quarter: "Last quarter",
  year: "Last year",
  custom: "Custom range",
};

export default async function PartnerEarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PARTNER") redirect("/dashboard");

  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner || partner.status !== "APPROVED") redirect("/dashboard/partner");

  const params = await searchParams;
  const period = (params.period as Period) || "this_month";
  const { from, to } = resolveRange(period, params.from, params.to);

  const [opening, inRange] = await Promise.all([
    prisma.partnerCommission.aggregate({
      where: { partnerId: partner.id, status: { in: ["PAID"] }, paidAt: { lt: from } },
      _sum: { amountKobo: true },
    }),
    prisma.partnerCommission.findMany({
      where: { partnerId: partner.id, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const commissionsSum = inRange
    .filter((c) => c.status !== "REVERSED" && c.status !== "CANCELLED")
    .reduce((acc, c) => acc + c.amountKobo, 0);
  const reversalsSum = inRange
    .filter((c) => c.status === "REVERSED")
    .reduce((acc, c) => acc + c.amountKobo, 0);

  const payoutsInRange = await prisma.partnerPayout.aggregate({
    where: { partnerId: partner.id, status: "PAID", paidAt: { gte: from, lte: to } },
    _sum: { amountKobo: true },
  });

  const openingBalance = opening._sum.amountKobo ?? 0;
  const payoutsSum = payoutsInRange._sum.amountKobo ?? 0;
  const closingBalance = openingBalance + commissionsSum - payoutsSum;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Earnings statement</h1>

      <form className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-400" htmlFor="period">
            Period
          </label>
          <select
            id="period"
            name="period"
            defaultValue={period}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400" htmlFor="from">
            From (custom)
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={params.from}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400" htmlFor="to">
            To (custom)
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={params.to}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
        >
          Apply
        </button>
        <a
          href={`/dashboard/partner/earnings/export?period=${period}${params.from ? `&from=${params.from}` : ""}${params.to ? `&to=${params.to}` : ""}`}
          className="rounded-lg border border-orange-700 px-4 py-2 text-sm text-orange-300 hover:border-orange-500"
        >
          Export CSV
        </a>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card title="Opening balance">
          <p className="text-lg font-semibold">{formatNaira(openingBalance)}</p>
        </Card>
        <Card title="Commissions">
          <p className="text-lg font-semibold">{formatNaira(commissionsSum)}</p>
        </Card>
        <Card title="Reversals">
          <p className="text-lg font-semibold text-red-400">-{formatNaira(reversalsSum)}</p>
        </Card>
        <Card title="Payouts">
          <p className="text-lg font-semibold">-{formatNaira(payoutsSum)}</p>
        </Card>
        <Card title="Closing balance">
          <p className="text-lg font-semibold">{formatNaira(closingBalance)}</p>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Commission transactions in this period">
          {inRange.length === 0 ? (
            <p className="text-sm text-slate-400">No commission activity in this period.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-2">Commission</th>
                  <th className="pb-2">Event</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {inRange.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800">
                    <td className="py-2 font-mono text-xs">{c.commissionNumber}</td>
                    <td className="py-2 text-slate-400">{c.eventType}</td>
                    <td className="py-2">{formatNaira(c.amountKobo)}</td>
                    <td className="py-2 text-slate-400">{c.status}</td>
                    <td className="py-2 text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString("en-NG")}
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
