"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createCampaign(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner || partner.status !== "APPROVED") {
    throw new Error("You are not an approved partner.");
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Campaign name is required.");
  const slug = slugify(name);
  if (!slug) throw new Error("Campaign name must contain letters or numbers.");

  const existing = await prisma.partnerCampaign.findUnique({
    where: { partnerId_slug: { partnerId: partner.id, slug } },
  });
  if (existing) throw new Error("You already have a campaign with that name.");

  await prisma.partnerCampaign.create({ data: { partnerId: partner.id, slug, name } });
  revalidatePath("/dashboard/partner/campaigns");
}

export async function renameCampaign(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner || partner.status !== "APPROVED") {
    throw new Error("You are not an approved partner.");
  }

  const campaignId = formData.get("campaignId") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Campaign name is required.");

  const campaign = await prisma.partnerCampaign.findUniqueOrThrow({ where: { id: campaignId } });
  if (campaign.partnerId !== partner.id) throw new Error("This campaign doesn't belong to you.");

  await prisma.partnerCampaign.update({ where: { id: campaignId }, data: { name } });
  revalidatePath("/dashboard/partner/campaigns");
}
