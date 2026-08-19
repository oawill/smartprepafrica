"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPartnerSettings } from "@/lib/partners/settings";
import { generatePayoutNumber } from "@/lib/partners/ids";

export async function requestPayout(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const partner = await prisma.partner.findUnique({ where: { userId: session.user.id } });
  if (!partner || partner.status !== "APPROVED") {
    throw new Error("You are not an approved partner.");
  }

  const settings = await getPartnerSettings();

  const available = await prisma.partnerCommission.aggregate({
    where: { partnerId: partner.id, status: "AVAILABLE", payoutId: null },
    _sum: { amountKobo: true },
  });
  const availableKobo = available._sum.amountKobo ?? 0;

  if (availableKobo < settings.minimumPayoutKobo) {
    throw new Error(
      `You need at least ₦${(settings.minimumPayoutKobo / 100).toLocaleString()} available to request a payout.`
    );
  }

  const method = (formData.get("method") as string) || partner.preferredPaymentMethod || "BANK_TRANSFER";

  await prisma.$transaction(async (tx) => {
    const commissions = await tx.partnerCommission.findMany({
      where: { partnerId: partner.id, status: "AVAILABLE", payoutId: null },
    });

    const payoutNumber = await generatePayoutNumber();
    const payout = await tx.partnerPayout.create({
      data: {
        payoutNumber,
        partnerId: partner.id,
        amountKobo: commissions.reduce((acc, c) => acc + c.amountKobo, 0),
        method,
        destinationSnapshot: {
          bankName: partner.bankName,
          bankAccountName: partner.bankAccountName,
          bankAccountNumber: partner.bankAccountNumber,
        },
        status: "REQUESTED",
      },
    });

    await tx.partnerCommission.updateMany({
      where: { id: { in: commissions.map((c) => c.id) } },
      data: { payoutId: payout.id },
    });
  });

  revalidatePath("/dashboard/partner/payouts");
}
