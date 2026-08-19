import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { buildReferralLink } from "@/lib/partners/qr";
import { createCampaign, renameCampaign } from "@/app/dashboard/partner/campaigns/actions";

export default async function PartnerCampaignsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PARTNER") redirect("/dashboard");

  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner || partner.status !== "APPROVED") redirect("/dashboard/partner");

  const campaigns = await prisma.partnerCampaign.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: "desc" },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

  const rows = await Promise.all(
    campaigns.map(async (c) => {
      const clicks = await prisma.partnerReferral.count({ where: { campaignId: c.id } });
      const registrations = await prisma.partnerReferral.count({
        where: { campaignId: c.id, status: "REGISTERED" },
      });
      const paidStudents = await prisma.partnerCommission.count({
        where: {
          partnerId: partner.id,
          eventType: "STUDENT_FIRST_SUBSCRIPTION",
          status: { in: ["QUALIFIED", "APPROVED", "AVAILABLE", "PAID"] },
          sourceUser: { referredByCampaignId: c.id },
        },
      });
      const conversionRate =
        clicks > 0 ? `${Math.round((registrations / clicks) * 100)}%` : "—";
      return { campaign: c, clicks, registrations, paidStudents, conversionRate };
    })
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">Campaigns</h1>
      <p className="mt-1 text-sm text-slate-400">
        Track performance separately for each place you share your link.
      </p>

      <div className="mt-6">
        <Card title="Create a campaign">
          <form action={createCampaign} className="flex flex-wrap gap-2">
            <input
              name="name"
              placeholder="e.g. Lagos Schools"
              required
              className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-orange-400"
            >
              Create
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {rows.length === 0 && (
          <p className="text-sm text-slate-400">No campaigns yet — create one above.</p>
        )}
        {rows.map(({ campaign, clicks, registrations, paidStudents, conversionRate }) => (
          <Card key={campaign.id} title={campaign.name}>
            <p className="break-all rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-orange-300">
              {buildReferralLink(baseUrl, partner.referralCode!, campaign.slug)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Clicks</p>
                <p className="text-lg font-semibold">{clicks}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Registrations</p>
                <p className="text-lg font-semibold">{registrations}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Paid students</p>
                <p className="text-lg font-semibold">{paidStudents}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Conversion</p>
                <p className="text-lg font-semibold">{conversionRate}</p>
              </div>
            </div>
            <form action={renameCampaign} className="mt-3 flex gap-2">
              <input type="hidden" name="campaignId" value={campaign.id} />
              <input
                name="name"
                defaultValue={campaign.name}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
              >
                Rename
              </button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
