"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";

const categories = ["CORPORATE_DOCUMENTS", "FINANCIAL", "PROGRAM", "POLICIES", "IMPACT"] as const;
const statuses = ["AVAILABLE", "DRAFT", "NEEDS_UPDATE", "MISSING"] as const;

export async function createReadinessItem(formData: FormData) {
  await requireActionPermission("funding_center.manage");
  const label = formData.get("label") as string;
  if (!label?.trim()) return;

  await prisma.educationAccessReadinessItem.create({
    data: {
      label: label.trim(),
      category: formData.get("category") as (typeof categories)[number],
      status: (formData.get("status") as (typeof statuses)[number]) || "MISSING",
      notes: (formData.get("notes") as string) || undefined,
    },
  });

  revalidatePath("/dashboard/admin/education-access/funding-center/readiness");
}

export async function updateReadinessItem(formData: FormData) {
  await requireActionPermission("funding_center.manage");
  const itemId = formData.get("itemId") as string;

  await prisma.educationAccessReadinessItem.update({
    where: { id: itemId },
    data: {
      status: formData.get("status") as (typeof statuses)[number],
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath("/dashboard/admin/education-access/funding-center/readiness");
}
