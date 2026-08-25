import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/dashboard/card";
import { createMarketingAsset, toggleAssetPublished } from "@/app/dashboard/admin/partners/marketing/actions";

const assetTypes = [
  "LOGO",
  "BANNER",
  "SOCIAL_GRAPHIC",
  "WHATSAPP_GRAPHIC",
  "BROCHURE",
  "FLYER",
  "QR_CODE",
  "SAMPLE_MESSAGE",
  "VIDEO",
  "OTHER",
] as const;

export default async function AdminMarketingPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const assets = await prisma.partnerMarketingAsset.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-h2 font-semibold text-text-primary">Marketing materials</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Assets and suggested messages shown to partners in their portal.
      </p>

      <div className="mt-6">
        <Card title="Add an asset">
          <form action={createMarketingAsset} className="grid grid-cols-2 gap-3">
            <input
              name="title"
              placeholder="Title"
              required
              className="col-span-2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <select
              name="assetType"
              defaultValue="SAMPLE_MESSAGE"
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            >
              {assetTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              name="url"
              placeholder="Asset URL (optional)"
              className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <input
              name="description"
              placeholder="Description (optional)"
              className="col-span-2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <textarea
              name="content"
              placeholder="Suggested message text (optional, for Sample Message type)"
              rows={2}
              className="col-span-2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-brand"
            />
            <button
              type="submit"
              className="col-span-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand-hover"
            >
              Publish asset
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-6 space-y-3">
        {assets.map((asset) => (
          <Card key={asset.id} title={asset.title}>
            <p className="text-xs text-text-muted">
              {asset.assetType} · {asset.isPublished ? "Published" : "Hidden"}
            </p>
            {asset.description && <p className="mt-1 text-sm text-text-secondary">{asset.description}</p>}
            {asset.content && (
              <p className="mt-1 rounded-lg border border-border bg-surface p-2 text-sm text-text-secondary">
                {asset.content}
              </p>
            )}
            <form action={toggleAssetPublished} className="mt-2">
              <input type="hidden" name="assetId" value={asset.id} />
              <button
                type="submit"
                className="rounded-lg border border-border-strong px-3 py-1 text-xs text-text-secondary hover:border-text-muted"
              >
                {asset.isPublished ? "Unpublish" : "Publish"}
              </button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
