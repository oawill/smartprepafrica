"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";

const orgTypes = [
  "INDIVIDUAL",
  "CORPORATION",
  "FOUNDATION",
  "NGO",
  "SCHOOL",
  "DIASPORA_ORGANIZATION",
  "ALUMNI_ASSOCIATION",
  "GOVERNMENT",
  "OTHER",
] as const;

const partnerSchema = z.object({
  organizationName: z.string().trim().min(1).max(200),
  organizationType: z.enum(orgTypes),
  contactName: z.string().trim().max(150).optional(),
  email: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  country: z.string().trim().max(100).optional(),
  website: z.string().trim().max(300).optional(),
  description: z.string().trim().max(1000).optional(),
});

export async function createPartner(formData: FormData) {
  await requireActionPermission("education_access.partners_manage");
  const parsed = partnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const data = parsed.data;

  await prisma.educationAccessPartner.create({
    data: {
      organizationName: data.organizationName,
      organizationType: data.organizationType,
      contactName: data.contactName || undefined,
      email: data.email,
      country: data.country || undefined,
      website: data.website || undefined,
      description: data.description || undefined,
    },
  });

  revalidatePath("/dashboard/admin/education-access/partners");
}

export async function setPartnerVisibility(formData: FormData) {
  await requireActionPermission("education_access.partners_manage");
  const partnerId = formData.get("partnerId") as string;
  const publicVisibility = formData.get("publicVisibility") === "on";

  await prisma.educationAccessPartner.update({
    where: { id: partnerId },
    data: { publicVisibility },
  });

  revalidatePath("/dashboard/admin/education-access/partners");
  revalidatePath("/education-access/partners");
}
