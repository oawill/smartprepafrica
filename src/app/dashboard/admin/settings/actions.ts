"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function savePlatformSettings(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    throw new Error("Only platform administrators can do that.");
  }

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
