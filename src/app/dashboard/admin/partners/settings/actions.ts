"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function saveProgramSettings(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    throw new Error("Only platform administrators can do that.");
  }

  await prisma.partnerSettings.upsert({
    where: { id: 1 },
    update: {
      attributionWindowDays: Number(formData.get("attributionWindowDays") ?? 30),
      minimumPayoutKobo: Math.round(Number(formData.get("minimumPayoutNaira") ?? 10000) * 100),
      requireAdminApproval: formData.get("requireAdminApproval") === "on",
      leaderboardEnabled: formData.get("leaderboardEnabled") === "on",
    },
    create: {
      id: 1,
      attributionWindowDays: Number(formData.get("attributionWindowDays") ?? 30),
      minimumPayoutKobo: Math.round(Number(formData.get("minimumPayoutNaira") ?? 10000) * 100),
      requireAdminApproval: formData.get("requireAdminApproval") === "on",
      leaderboardEnabled: formData.get("leaderboardEnabled") === "on",
    },
  });

  revalidatePath("/dashboard/admin/partners/settings");
}
