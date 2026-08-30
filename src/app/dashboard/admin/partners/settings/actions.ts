"use server";

import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export async function saveProgramSettings(formData: FormData) {
  await requireActionPermission("settings.update");

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
