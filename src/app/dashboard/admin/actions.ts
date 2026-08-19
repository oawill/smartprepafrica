"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePartnerNumber, referralCodeFromPartnerNumber } from "@/lib/partners/ids";
import { logPartnerAudit } from "@/lib/partners/audit";
import { notifyPartner } from "@/lib/partners/notify";

export async function approvePartner(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    throw new Error("Only platform administrators can do that.");
  }

  const partnerId = formData.get("partnerId") as string;
  const partner = await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });
  if (partner.status !== "PENDING") return;

  const partnerNumber = await generatePartnerNumber();
  const referralCode = referralCodeFromPartnerNumber(partnerNumber);

  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedById: session.user.id,
      partnerNumber,
      referralCode,
    },
  });

  await logPartnerAudit({
    actorUserId: session.user.id,
    action: "PARTNER_APPROVED",
    entityType: "Partner",
    entityId: partnerId,
    metadata: { partnerNumber },
  });

  await notifyPartner(
    partnerId,
    "APPLICATION_APPROVED",
    `You're approved! Your Partner ID is ${partnerNumber}.`
  );

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/partners");
  revalidatePath(`/dashboard/admin/partners/${partnerId}`);
}

export async function rejectPartner(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    throw new Error("Only platform administrators can do that.");
  }

  const partnerId = formData.get("partnerId") as string;
  const partner = await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });
  if (partner.status !== "PENDING") return;

  await prisma.partner.update({
    where: { id: partnerId },
    data: { status: "REJECTED" },
  });

  await logPartnerAudit({
    actorUserId: session.user.id,
    action: "PARTNER_REJECTED",
    entityType: "Partner",
    entityId: partnerId,
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/partners");
  revalidatePath(`/dashboard/admin/partners/${partnerId}`);
}
