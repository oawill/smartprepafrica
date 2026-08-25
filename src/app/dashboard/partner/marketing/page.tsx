import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";

export default async function PartnerMarketingPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PARTNER") redirect("/dashboard");

  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner || partner.status !== "APPROVED") redirect("/dashboard/partner");

  const assets = await prisma.partnerMarketingAsset.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">Marketing materials</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Ready-to-use assets and suggested messages for promoting SmartPrepAfrica.com.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {assets.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No marketing materials have been published yet — check back soon.
          </p>
        ) : (
          assets.map((asset) => (
            <Card key={asset.id} title={asset.title}>
              {asset.description && (
                <p className="text-sm text-text-secondary">{asset.description}</p>
              )}
              {asset.content && (
                <p className="mt-2 rounded-lg border border-border bg-surface p-3 text-sm text-text-secondary">
                  {asset.content}
                </p>
              )}
              {asset.url && (
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-brand-text hover:underline"
                >
                  Open asset →
                </a>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
