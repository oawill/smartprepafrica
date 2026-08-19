import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { runQualificationSweep, formatNaira, computeTierForPartner } from "@/lib/partners/compensation";
import { buildReferralLink, referralQrDataUri } from "@/lib/partners/qr";
import {
  addSchoolLead,
  requestInvitationLink,
  setLeadStage,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/dashboard/partner/actions";
import { ReferralLinkCard } from "@/components/partner/referral-link-card";

const editableStages = ["CONTACTED", "DEMO_SCHEDULED", "NEGOTIATING", "LOST"] as const;

const stageLabels: Record<string, string> = {
  NEW_LEAD: "New lead",
  CONTACTED: "Contacted",
  DEMO_SCHEDULED: "Demo scheduled",
  NEGOTIATING: "Negotiating",
  SCHOOL_REGISTERED: "School registered",
  ACTIVATED: "Activated",
  PAYING_SCHOOL: "Paying school",
  LOST: "Lost",
};

export default async function PartnerDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PARTNER") redirect("/dashboard");

  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner) redirect("/dashboard");

  if (partner.status !== "APPROVED") {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Partner application: {partner.status}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {partner.status === "PENDING"
            ? "Your application is awaiting admin review. We'll notify you once it's approved."
            : partner.status === "REJECTED"
              ? "Your application was not approved."
              : "Your partner account is not currently active."}
        </p>
      </div>
    );
  }

  await runQualificationSweep(partner.id);

  const [studentsReferred, paidStudents, schoolLeads, activeSchools, commissions, tier] =
    await Promise.all([
      prisma.partnerReferral.count({ where: { partnerId: partner.id, status: "REGISTERED" } }),
      prisma.partnerCommission.count({
        where: {
          partnerId: partner.id,
          eventType: "STUDENT_FIRST_SUBSCRIPTION",
          status: { in: ["QUALIFIED", "APPROVED", "AVAILABLE", "PAID"] },
        },
      }),
      prisma.partnerSchoolLead.findMany({
        where: { partnerId: partner.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.partnerSchoolAttribution.count({ where: { partnerId: partner.id } }),
      prisma.partnerCommission.groupBy({
        by: ["status"],
        where: { partnerId: partner.id },
        _sum: { amountKobo: true },
      }),
      computeTierForPartner(partner.id),
    ]);

  const sumFor = (statuses: string[]) =>
    commissions
      .filter((c) => statuses.includes(c.status))
      .reduce((acc, c) => acc + (c._sum.amountKobo ?? 0), 0);

  const pendingCommission = sumFor(["PENDING", "QUALIFIED", "APPROVED"]);
  // Excludes commissions already earmarked for a pending payout request.
  const availableForPayoutAgg = await prisma.partnerCommission.aggregate({
    where: { partnerId: partner.id, status: "AVAILABLE", payoutId: null },
    _sum: { amountKobo: true },
  });
  const availableForPayout = availableForPayoutAgg._sum.amountKobo ?? 0;
  const lifetimeEarnings = sumFor(["AVAILABLE", "PAID"]);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";
  const referralLink = buildReferralLink(baseUrl, partner.referralCode!);
  const qrDataUri = await referralQrDataUri(referralLink);

  const partnerSince = partner.approvedAt
    ? new Date(partner.approvedAt).toLocaleDateString("en-NG", { month: "long", year: "numeric" })
    : "—";

  const unreadNotifications = await prisma.partnerNotification.findMany({
    where: { partnerId: partner.id, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {partner.firstName}.</h1>
        <p className="mt-1 text-sm text-slate-400">
          Partner ID: <span className="font-mono text-slate-300">{partner.partnerNumber}</span>
          {" · "}Partner Since: {partnerSince}
          {" · "}Status: <span className="text-green-400">Active</span>
          {tier && <> · Tier: {tier.name}</>}
        </p>
      </div>

      {unreadNotifications.length > 0 && (
        <div className="mt-4">
          <Card title={`Notifications (${unreadNotifications.length} unread)`}>
            <div className="space-y-2">
              {unreadNotifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                >
                  <p className="text-sm text-slate-300">{n.message}</p>
                  <form action={markNotificationRead}>
                    <input type="hidden" name="notificationId" value={n.id} />
                    <button
                      type="submit"
                      className="shrink-0 text-xs text-slate-500 hover:text-slate-300"
                    >
                      Dismiss
                    </button>
                  </form>
                </div>
              ))}
            </div>
            <form action={markAllNotificationsRead} className="mt-2">
              <button type="submit" className="text-xs text-orange-400 hover:underline">
                Mark all as read
              </button>
            </form>
          </Card>
        </div>
      )}

      <ReferralLinkCard referralLink={referralLink} qrDataUri={qrDataUri} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Students referred">
          <p className="text-3xl font-semibold">{studentsReferred}</p>
        </Card>
        <Card title="Paid students">
          <p className="text-3xl font-semibold">{paidStudents}</p>
        </Card>
        <Card title="Schools referred">
          <p className="text-3xl font-semibold">{schoolLeads.length}</p>
        </Card>
        <Card title="Active schools">
          <p className="text-3xl font-semibold">{activeSchools}</p>
        </Card>
        <Card title="Pending commission">
          <p className="text-2xl font-semibold">{formatNaira(pendingCommission)}</p>
        </Card>
        <Card title="Available for payout">
          <p className="text-2xl font-semibold">{formatNaira(availableForPayout)}</p>
        </Card>
        <Card title="Lifetime earnings">
          <p className="text-2xl font-semibold">{formatNaira(lifetimeEarnings)}</p>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Add a school lead">
          <form action={addSchoolLead} className="grid gap-3 sm:grid-cols-2">
            <input
              name="schoolName"
              placeholder="School name"
              required
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="contactName"
              placeholder="Contact name"
              required
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="phone"
              placeholder="Phone"
              required
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="email"
              placeholder="Email (optional)"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="state"
              placeholder="State (optional)"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="city"
              placeholder="City (optional)"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="estimatedStudents"
              type="number"
              placeholder="Estimated students"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <input
              name="estimatedTeachers"
              type="number"
              placeholder="Estimated teachers"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <textarea
              name="notes"
              placeholder="Notes (optional)"
              className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="sm:col-span-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Add lead
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="My school leads">
          {schoolLeads.length === 0 ? (
            <p className="text-sm text-slate-400">No school leads yet.</p>
          ) : (
            <div className="space-y-4">
              {schoolLeads.map((lead) => (
                <div key={lead.id} className="rounded-lg border border-slate-800 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{lead.schoolName}</p>
                      <p className="text-xs text-slate-500">
                        {lead.leadNumber} · {lead.contactName} · {lead.phone}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                      {stageLabels[lead.status] ?? lead.status}
                    </span>
                  </div>

                  {!["SCHOOL_REGISTERED", "ACTIVATED", "PAYING_SCHOOL", "LOST"].includes(
                    lead.status
                  ) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {editableStages.map((stage) => (
                        <form action={setLeadStage} key={stage}>
                          <input type="hidden" name="leadId" value={lead.id} />
                          <input type="hidden" name="toStatus" value={stage} />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-500"
                          >
                            Mark {stageLabels[stage]}
                          </button>
                        </form>
                      ))}
                      {!lead.invitationToken && (
                        <form action={requestInvitationLink}>
                          <input type="hidden" name="leadId" value={lead.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-orange-700 px-3 py-1 text-xs text-orange-300 hover:border-orange-500"
                          >
                            Generate invitation link
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {lead.invitationToken && lead.status !== "SCHOOL_REGISTERED" && (
                    <p className="mt-3 break-all rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-orange-300">
                      {baseUrl}/schools/invite/{lead.invitationToken}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
