"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyPartner } from "@/lib/partners/notify";
import { logPartnerAudit } from "@/lib/partners/audit";

async function assertAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    throw new Error("Only platform administrators can do that.");
  }
  return session;
}

export async function approvePayout(formData: FormData) {
  const session = await assertAdmin();
  const payoutId = formData.get("payoutId") as string;

  const payout = await prisma.partnerPayout.findUniqueOrThrow({ where: { id: payoutId } });
  if (payout.status !== "REQUESTED") return;

  await prisma.partnerPayout.update({
    where: { id: payoutId },
    data: { status: "APPROVED", approvedAt: new Date(), approvedById: session.user.id },
  });

  await notifyPartner(
    payout.partnerId,
    "PAYOUT_APPROVED",
    `Your payout request ${payout.payoutNumber} was approved and is being processed.`
  );
  await logPartnerAudit({
    actorUserId: session.user.id,
    action: "PAYOUT_APPROVED",
    entityType: "PartnerPayout",
    entityId: payoutId,
  });

  revalidatePath("/dashboard/admin/payouts");
}

// Never marks a payout PAID until the admin explicitly confirms the transfer
// actually happened — this action IS that confirmation step, not an
// automatic follow-on to approval.
export async function markPayoutPaid(formData: FormData) {
  const session = await assertAdmin();
  const payoutId = formData.get("payoutId") as string;

  const payout = await prisma.partnerPayout.findUniqueOrThrow({ where: { id: payoutId } });
  if (payout.status !== "APPROVED") return;

  await prisma.$transaction(async (tx) => {
    await tx.partnerPayout.update({
      where: { id: payoutId },
      data: { status: "PAID", paidAt: new Date() },
    });
    await tx.partnerCommission.updateMany({
      where: { payoutId },
      data: { status: "PAID", paidAt: new Date() },
    });
  });

  await notifyPartner(
    payout.partnerId,
    "PAYOUT_COMPLETED",
    `Your payout ${payout.payoutNumber} has been paid.`
  );
  await logPartnerAudit({
    actorUserId: session.user.id,
    action: "PAYOUT_PAID",
    entityType: "PartnerPayout",
    entityId: payoutId,
  });

  revalidatePath("/dashboard/admin/payouts");
}

export async function rejectPayout(formData: FormData) {
  const session = await assertAdmin();
  const payoutId = formData.get("payoutId") as string;
  const reason = (formData.get("reason") as string)?.trim() || "Not specified";

  const payout = await prisma.partnerPayout.findUniqueOrThrow({ where: { id: payoutId } });
  if (payout.status !== "REQUESTED" && payout.status !== "APPROVED") return;

  await prisma.$transaction(async (tx) => {
    await tx.partnerPayout.update({
      where: { id: payoutId },
      data: { status: "REJECTED", rejectedReason: reason },
    });
    // Release the commissions back to AVAILABLE so the partner can request
    // a payout for them again.
    await tx.partnerCommission.updateMany({
      where: { payoutId },
      data: { payoutId: null },
    });
  });

  await logPartnerAudit({
    actorUserId: session.user.id,
    action: "PAYOUT_REJECTED",
    entityType: "PartnerPayout",
    entityId: payoutId,
    metadata: { reason },
  });

  revalidatePath("/dashboard/admin/payouts");
}
