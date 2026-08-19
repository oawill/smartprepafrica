import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { formatNaira } from "@/lib/partners/compensation";

const statusColor: Record<string, string> = {
  PENDING: "text-amber-400",
  APPROVED: "text-green-400",
  SUSPENDED: "text-orange-400",
  REJECTED: "text-red-400",
  CLOSED: "text-slate-500",
};

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const q = params.q?.trim();
  const status = params.status;

  const [totalPartners, approvedPartners, pendingPartners, totalCommissionsPaid, pendingFraudFlags, partners] =
    await Promise.all([
      prisma.partner.count(),
      prisma.partner.count({ where: { status: "APPROVED" } }),
      prisma.partner.count({ where: { status: "PENDING" } }),
      prisma.partnerCommission.aggregate({
        where: { status: "PAID" },
        _sum: { amountKobo: true },
      }),
      prisma.partnerFraudFlag.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
      prisma.partner.findMany({
        where: {
          ...(status ? { status: status as never } : {}),
          ...(q
            ? {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { partnerNumber: { contains: q, mode: "insensitive" } },
                  { phone: { contains: q, mode: "insensitive" } },
                  { city: { contains: q, mode: "insensitive" } },
                  { state: { contains: q, mode: "insensitive" } },
                  { user: { email: { contains: q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Partners</h1>
          <p className="mt-1 text-sm text-slate-400">
            Platform-wide partner program management.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/dashboard/admin/partners?status=PENDING"
            className="rounded-lg border border-amber-800 px-3 py-2 text-xs text-amber-400 hover:border-amber-600"
          >
            Pending applications {pendingPartners > 0 ? `(${pendingPartners})` : ""} →
          </Link>
          <Link
            href="/dashboard/admin/partners/compensation"
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
          >
            Compensation rules →
          </Link>
          <Link
            href="/dashboard/admin/partners/tiers"
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
          >
            Tiers →
          </Link>
          <Link
            href="/dashboard/admin/partners/fraud"
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
          >
            Fraud review {pendingFraudFlags > 0 ? `(${pendingFraudFlags})` : ""} →
          </Link>
          <Link
            href="/dashboard/admin/partners/disputes"
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
          >
            Disputes →
          </Link>
          <Link
            href="/dashboard/admin/partners/marketing"
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
          >
            Marketing →
          </Link>
          <Link
            href="/dashboard/admin/partners/settings"
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
          >
            Settings →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card title="Total partners">
          <p className="text-3xl font-semibold">{totalPartners}</p>
        </Card>
        <Card title="Approved partners">
          <p className="text-3xl font-semibold">{approvedPartners}</p>
        </Card>
        <Card title="Total commissions paid">
          <p className="text-3xl font-semibold">
            {formatNaira(totalCommissionsPaid._sum.amountKobo ?? 0)}
          </p>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Search partners">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, ID, email, phone, city, state…"
              className="flex-1 min-w-[220px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <select
              name="status"
              defaultValue={status}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            >
              <option value="">Any status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
              <option value="CLOSED">Closed</option>
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              Search
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`${partners.length} partner${partners.length === 1 ? "" : "s"}`}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="pb-2">Partner</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Location</th>
                <th className="pb-2">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-t border-slate-800">
                  <td className="py-2">
                    {p.firstName} {p.lastName}
                    <span className="ml-2 font-mono text-xs text-slate-500">
                      {p.partnerNumber ?? "—"}
                    </span>
                  </td>
                  <td className="py-2 text-slate-400">{p.user.email}</td>
                  <td className="py-2 text-slate-400">{p.partnerType}</td>
                  <td className="py-2 text-slate-400">
                    {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className={`py-2 ${statusColor[p.status] ?? ""}`}>{p.status}</td>
                  <td className="py-2 text-right">
                    <Link
                      href={`/dashboard/admin/partners/${p.id}`}
                      className="text-xs text-orange-400 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
