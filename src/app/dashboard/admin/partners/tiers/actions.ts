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

export async function upsertTier(formData: FormData) {
  await assertAdmin();

  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Tier name is required.");

  await prisma.partnerTier.upsert({
    where: { name },
    update: {
      minPaidStudents: Number(formData.get("minPaidStudents") ?? 0),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      perks: (formData.get("perks") as string)?.trim() || null,
      bonusPercentage: Number(formData.get("bonusPercentage") ?? 0),
    },
    create: {
      name,
      minPaidStudents: Number(formData.get("minPaidStudents") ?? 0),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      perks: (formData.get("perks") as string)?.trim() || null,
      bonusPercentage: Number(formData.get("bonusPercentage") ?? 0),
    },
  });

  revalidatePath("/dashboard/admin/partners/tiers");
}
