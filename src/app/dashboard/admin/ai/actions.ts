"use server";

import { revalidatePath } from "next/cache";
import type { SubscriptionPlan } from "@prisma/client";
import { requireActionPermission } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export async function updatePlanLimit(formData: FormData) {
  await requireActionPermission("settings.update");

  const plan = formData.get("plan") as SubscriptionPlan;
  const monthlyMessageLimit = Number(formData.get("monthlyMessageLimit"));
  if (!monthlyMessageLimit || monthlyMessageLimit < 0) {
    throw new Error("Enter a valid monthly message limit.");
  }

  await prisma.aiPlanLimit.upsert({
    where: { plan },
    update: { monthlyMessageLimit },
    // dailyMessageLimit is a legacy required column no longer read by usage
    // checks; kept populated with a proportional value so it stays a valid row.
    create: { plan, dailyMessageLimit: Math.ceil(monthlyMessageLimit / 30), monthlyMessageLimit },
  });

  revalidatePath("/dashboard/admin/ai");
}
