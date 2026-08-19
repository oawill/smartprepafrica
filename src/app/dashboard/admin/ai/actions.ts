"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SubscriptionPlan } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updatePlanLimit(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    throw new Error("Only platform administrators can do that.");
  }

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
