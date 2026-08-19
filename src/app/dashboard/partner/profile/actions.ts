"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updatePartnerProfile(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner) throw new Error("You are not a partner.");

  await prisma.partner.update({
    where: { id: partner.id },
    data: {
      phone: (formData.get("phone") as string)?.trim() || partner.phone,
      state: (formData.get("state") as string)?.trim() || null,
      city: (formData.get("city") as string)?.trim() || null,
      organization: (formData.get("organization") as string)?.trim() || null,
      preferredPaymentMethod: (formData.get("preferredPaymentMethod") as string) || null,
      bankName: (formData.get("bankName") as string)?.trim() || null,
      bankAccountName: (formData.get("bankAccountName") as string)?.trim() || null,
      bankAccountNumber: (formData.get("bankAccountNumber") as string)?.trim() || null,
      hideFromLeaderboard: formData.get("hideFromLeaderboard") === "on",
    },
  });

  revalidatePath("/dashboard/partner/profile");
}
