"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function assertAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    throw new Error("Only platform administrators can do that.");
  }
}

export async function createMarketingAsset(formData: FormData) {
  await assertAdmin();

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
  await assertAdmin();
  const assetId = formData.get("assetId") as string;

  const asset = await prisma.partnerMarketingAsset.findUniqueOrThrow({ where: { id: assetId } });
  await prisma.partnerMarketingAsset.update({
    where: { id: assetId },
    data: { isPublished: !asset.isPublished },
  });

  revalidatePath("/dashboard/admin/partners/marketing");
}
