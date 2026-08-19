"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logPartnerAudit } from "@/lib/partners/audit";

async function assertAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    throw new Error("Only platform administrators can do that.");
  }
  return session;
}

export async function resolveDispute(formData: FormData) {
  const session = await assertAdmin();
  const disputeId = formData.get("disputeId") as string;
  const decision = formData.get("decision") as "INCUMBENT" | "CHALLENGER";
  const resolution = (formData.get("resolution") as string)?.trim() || null;

  const dispute = await prisma.partnerSchoolDispute.findUniqueOrThrow({ where: { id: disputeId } });
  if (dispute.status !== "OPEN") return;

  await prisma.$transaction(async (tx) => {
    if (decision === "CHALLENGER") {
      // Admin decided the challenger's claim is the correct one — reassign
      // the attribution. This is the ONLY path that ever changes an
      // existing attribution after the fact, and it's logged.
      await tx.partnerSchoolAttribution.update({
        where: { schoolId: dispute.schoolId },
        data: {
          partnerId: dispute.challengerPartnerId,
          winningLeadId: dispute.challengerLeadId,
          decidedById: session.user.id,
          decisionNote: resolution,
        },
      });
    }

    await tx.partnerSchoolDispute.update({
      where: { id: disputeId },
      data: {
        status: decision === "CHALLENGER" ? "RESOLVED_CHALLENGER" : "RESOLVED_INCUMBENT",
        resolution,
        resolvedById: session.user.id,
        resolvedAt: new Date(),
      },
    });
  });

  await logPartnerAudit({
    actorUserId: session.user.id,
    action: "SCHOOL_ATTRIBUTION_DISPUTE_RESOLVED",
    entityType: "PartnerSchoolDispute",
    entityId: disputeId,
    metadata: { decision },
  });

  revalidatePath("/dashboard/admin/partners/disputes");
}
