"use server";

import { revalidatePath } from "next/cache";
import type { SubscriptionPlan } from "@prisma/client";
import { requireActionPermission } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export async function updatePlanLimit(formData: FormData) {
  await requireActionPermission("settings.update");

  const plan = formData.get("plan") as SubscriptionPlan;
  const dailyMessageLimit = Number(formData.get("dailyMessageLimit"));
  if (!dailyMessageLimit || dailyMessageLimit < 0) {
    throw new Error("Enter a valid daily message limit.");
  }

  await prisma.aiPlanLimit.upsert({
    where: { plan },
    update: { dailyMessageLimit },
    create: { plan, dailyMessageLimit },
  });

  revalidatePath("/dashboard/admin/ai");
}
