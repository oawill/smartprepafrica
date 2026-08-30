"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";

export async function createMarketingAsset(formData: FormData) {
  await requireActionPermission("partners.approve");

  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Title is required.");

  await prisma.partnerMarketingAsset.create({
    data: {
      title,
      description: (formData.get("description") as string)?.trim() || null,
      assetType: formData.get("assetType") as never,
      url: (formData.get("url") as string)?.trim() || null,
      content: (formData.get("content") as string)?.trim() || null,
      isPublished: true,
    },
  });

  revalidatePath("/dashboard/admin/partners/marketing");
}

export async function toggleAssetPublished(formData: FormData) {
  await requireActionPermission("partners.approve");
  const assetId = formData.get("assetId") as string;

  const asset = await prisma.partnerMarketingAsset.findUniqueOrThrow({ where: { id: assetId } });
  await prisma.partnerMarketingAsset.update({
    where: { id: assetId },
    data: { isPublished: !asset.isPublished },
  });

  revalidatePath("/dashboard/admin/partners/marketing");
}
