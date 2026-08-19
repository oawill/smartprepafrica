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

export async function resolveFraudFlag(formData: FormData) {
  const session = await assertAdmin();
  const flagId = formData.get("flagId") as string;
  const decision = formData.get("decision") as "CONFIRMED" | "DISMISSED";
  const reviewNote = (formData.get("reviewNote") as string)?.trim() || null;

  await prisma.partnerFraudFlag.update({
    where: { id: flagId },
    data: { status: decision, reviewedById: session.user.id, reviewNote, resolvedAt: new Date() },
  });

  await logPartnerAudit({
    actorUserId: session.user.id,
    action: "FRAUD_FLAG_RESOLVED",
    entityType: "PartnerFraudFlag",
    entityId: flagId,
    metadata: { decision },
  });

  revalidatePath("/dashboard/admin/partners/fraud");
}
