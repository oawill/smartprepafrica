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
          <h1 className="text-2xl font-semibold text-text-primary">
            {partner.firstName} {partner.lastName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
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
                  className="rounded-lg border border-success/40 px-3 py-2 text-xs text-success hover:border-success"
                >
                  Approve
                </button>
              </form>
              <form action={rejectPartner}>
                <input type="hidden" name="partnerId" value={partner.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-danger/40 px-3 py-2 text-xs text-danger hover:border-danger"
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
                className="rounded-lg border border-warning/40 px-3 py-2 text-xs text-warning hover:border-warning"
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
                className="rounded-lg border border-success/40 px-3 py-2 text-xs text-success hover:border-success"
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
                className="rounded-lg border border-danger/40 px-3 py-2 text-xs text-danger hover:border-danger"
              >
                Close
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Contact">
          <p className="text-sm text-text-secondary">{partner.phone}</p>
          <p className="text-sm text-text-secondary">
            {[partner.city, partner.state, partner.country].filter(Boolean).join(", ")}
          </p>
          {partner.organization && (
            <p className="text-sm text-text-secondary">{partner.organization}</p>
          )}
        </Card>
        <Card title="Students referred">
          <p className="text-2xl font-semibold text-text-primary">{referrals}</p>
        </Card>
        <Card title="Schools referred">
          <p className="text-2xl font-semibold text-text-primary">{schoolLeads.length}</p>
        </Card>
        <Card title="Lifetime earnings">
          <p className="text-2xl font-semibold text-text-primary">{formatNaira(lifetime._sum.amountKobo ?? 0)}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card title="Payout details">
          <p className="text-sm text-text-secondary">
            Method: {partner.preferredPaymentMethod ?? "Not set"}
          </p>
          <p className="text-sm text-text-secondary">Bank: {partner.bankName ?? "—"}</p>
          <p className="text-sm text-text-secondary">
            Account: {partner.bankAccountName ?? "—"} {partner.bankAccountNumber ?? ""}
          </p>
        </Card>
        <Card title="Fraud flags">
          {fraudFlags.length === 0 ? (
            <p className="text-sm text-text-secondary">No fraud flags.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {fraudFlags.map((f) => (
                <li key={f.id} className="text-warning">
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
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="rounded-lg border border-border-strong px-4 py-2 text-xs text-text-secondary hover:border-text-muted"
            >
              Save notes
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="School leads">
          {schoolLeads.length === 0 ? (
            <p className="text-sm text-text-secondary">No school leads.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2">Lead</th>
                  <th className="pb-2">School</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {schoolLeads.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs text-text-primary">{l.leadNumber}</td>
                    <td className="py-2 text-text-primary">{l.schoolName}</td>
                    <td className="py-2 text-text-secondary">{l.status}</td>
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
            <p className="text-sm text-text-secondary">No commissions yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2">Commission</th>
                  <th className="pb-2">Event</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs text-text-primary">{c.commissionNumber}</td>
                    <td className="py-2 text-text-secondary">{c.eventType}</td>
                    <td className="py-2 text-text-primary">{formatNaira(c.amountKobo)}</td>
                    <td className="py-2 text-text-secondary">{c.status}</td>
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
            <p className="text-sm text-text-secondary">No payouts yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="pb-2">Payout</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs text-text-primary">{p.payoutNumber}</td>
                    <td className="py-2 text-text-primary">{formatNaira(p.amountKobo)}</td>
                    <td className="py-2 text-text-secondary">{p.status}</td>
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
