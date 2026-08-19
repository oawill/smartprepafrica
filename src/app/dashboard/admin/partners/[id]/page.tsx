import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { formatNaira, computeTierForPartner } from "@/lib/partners/compensation";
import { suspendPartner, reactivatePartner, closePartner, saveAdminNotes } from "@/app/dashboard/admin/partners/[id]/actions";
import { approvePartner, rejectPartner } from "@/app/dashboard/admin/actions";

export default async function AdminPartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;
  const partner = await prisma.partner.findUnique({
    where: { id },
    include: { user: { select: { email: true, createdAt: true } } },
  });
  if (!partner) notFound();

  const [
    referrals,
    schoolLeads,
    commissions,
    payouts,
    fraudFlags,
    tier,
    lifetime,
  ] = await Promise.all([
    prisma.partnerReferral.count({ where: { partnerId: partner.id, status: "REGISTERED" } }),
    prisma.partnerSchoolLead.findMany({ where: { partnerId: partner.id }, orderBy: { createdAt: "desc" } }),
    prisma.partnerCommission.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.partnerPayout.findMany({ where: { partnerId: partner.id }, orderBy: { requestedAt: "desc" } }),
    prisma.partnerFraudFlag.findMany({ where: { partnerId: partner.id }, orderBy: { createdAt: "desc" } }),
    computeTierForPartner(partner.id),
    prisma.partnerCommission.aggregate({
      where: { partnerId: partner.id, status: { in: ["AVAILABLE", "PAID"] } },
      _sum: { amountKobo: true },
    }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {partner.firstName} {partner.lastName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {partner.partnerNumber ?? "Not yet approved"} · {partner.user.email} · {partner.status}
            {tier && ` · Tier: ${tier.name}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {partner.status === "PENDING" && (
            <>
              <form action={approvePartner}>
                <input type="hidden" name="partnerId" value={partner.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-green-800 px-3 py-2 text-xs text-green-400 hover:border-green-600"
                >
                  Approve
                </button>
              </form>
              <form action={rejectPartner}>
                <input type="hidden" name="partnerId" value={partner.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-400 hover:border-red-700"
                >
                  Reject
                </button>
              </form>
            </>
          )}
          {partner.status === "APPROVED" && (
            <form action={suspendPartner}>
              <input type="hidden" name="partnerId" value={partner.id} />
              <button
                type="submit"
                className="rounded-lg border border-amber-800 px-3 py-2 text-xs text-amber-400 hover:border-amber-600"
              >
                Suspend
              </button>
            </form>
          )}
          {partner.status === "SUSPENDED" && (
            <form action={reactivatePartner}>
              <input type="hidden" name="partnerId" value={partner.id} />
              <button
                type="submit"
                className="rounded-lg border border-green-800 px-3 py-2 text-xs text-green-400 hover:border-green-600"
              >
                Reactivate
              </button>
            </form>
          )}
          {partner.status !== "CLOSED" && (
            <form action={closePartner}>
              <input type="hidden" name="partnerId" value={partner.id} />
              <button
                type="submit"
                className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-400 hover:border-red-700"
              >
                Close
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Contact">
          <p className="text-sm text-slate-300">{partner.phone}</p>
          <p className="text-sm text-slate-400">
            {[partner.city, partner.state, partner.country].filter(Boolean).join(", ")}
          </p>
          {partner.organization && (
            <p className="text-sm text-slate-400">{partner.organization}</p>
          )}
        </Card>
        <Card title="Students referred">
          <p className="text-2xl font-semibold">{referrals}</p>
        </Card>
        <Card title="Schools referred">
          <p className="text-2xl font-semibold">{schoolLeads.length}</p>
        </Card>
        <Card title="Lifetime earnings">
          <p className="text-2xl font-semibold">{formatNaira(lifetime._sum.amountKobo ?? 0)}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card title="Payout details">
          <p className="text-sm text-slate-300">
            Method: {partner.preferredPaymentMethod ?? "Not set"}
          </p>
          <p className="text-sm text-slate-400">Bank: {partner.bankName ?? "—"}</p>
          <p className="text-sm text-slate-400">
            Account: {partner.bankAccountName ?? "—"} {partner.bankAccountNumber ?? ""}
          </p>
        </Card>
        <Card title="Fraud flags">
          {fraudFlags.length === 0 ? (
            <p className="text-sm text-slate-400">No fraud flags.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {fraudFlags.map((f) => (
                <li key={f.id} className="text-amber-400">
                  {f.reason} — {f.status}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Admin notes">
          <form action={saveAdminNotes} className="space-y-2">
            <input type="hidden" name="partnerId" value={partner.id} />
            <textarea
              name="adminNotes"
              defaultValue={partner.adminNotes ?? ""}
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:border-slate-500"
            >
              Save notes
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="School leads">
          {schoolLeads.length === 0 ? (
            <p className="text-sm text-slate-400">No school leads.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-2">Lead</th>
                  <th className="pb-2">School</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {schoolLeads.map((l) => (
                  <tr key={l.id} className="border-t border-slate-800">
                    <td className="py-2 font-mono text-xs">{l.leadNumber}</td>
                    <td className="py-2">{l.schoolName}</td>
                    <td className="py-2 text-slate-400">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Recent commissions">
          {commissions.length === 0 ? (
            <p className="text-sm text-slate-400">No commissions yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-2">Commission</th>
                  <th className="pb-2">Event</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800">
                    <td className="py-2 font-mono text-xs">{c.commissionNumber}</td>
                    <td className="py-2 text-slate-400">{c.eventType}</td>
                    <td className="py-2">{formatNaira(c.amountKobo)}</td>
                    <td className="py-2 text-slate-400">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Payout history">
          {payouts.length === 0 ? (
            <p className="text-sm text-slate-400">No payouts yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pb-2">Payout</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-slate-800">
                    <td className="py-2 font-mono text-xs">{p.payoutNumber}</td>
                    <td className="py-2">{formatNaira(p.amountKobo)}</td>
                    <td className="py-2 text-slate-400">{p.status}</td>
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
