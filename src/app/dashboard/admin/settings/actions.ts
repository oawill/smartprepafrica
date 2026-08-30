"use server";

import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export async function savePlatformSettings(formData: FormData) {
  await requireActionPermission("settings.update");

  const data = {
    companyLegalName: (formData.get("companyLegalName") as string)?.trim() || null,
    supportEmail: (formData.get("supportEmail") as string)?.trim() || null,
    supportPhone: (formData.get("supportPhone") as string)?.trim() || null,
    companyAddress: (formData.get("companyAddress") as string)?.trim() || null,
    supportHours: (formData.get("supportHours") as string)?.trim() || null,
  };

  await prisma.platformSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });

  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/contact");
}
