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

// Never mutates an existing PartnerCommissionRule row — creates version+1
// and deactivates the previous version. Every past PartnerCommission points
// at the exact rule-version id that produced it, so this never changes what
// a partner already earned.
export async function saveCompensationRule(formData: FormData) {
  const session = await assertAdmin();

  const ruleKey = (formData.get("ruleKey") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  if (!ruleKey || !name) throw new Error("Rule key and name are required.");

  const calcType = formData.get("calcType") as "FIXED" | "PERCENTAGE";
  const fixedAmountNaira = formData.get("fixedAmountNaira") as string;
  const percentage = formData.get("percentage") as string;
  const qualificationHoldDays = Number(formData.get("qualificationHoldDays") ?? 14);
  const eventType = formData.get("eventType") as string;

  const existing = await prisma.partnerCommissionRule.findFirst({
    where: { ruleKey, isActive: true },
    orderBy: { version: "desc" },
  });
  const nextVersion = (existing?.version ?? 0) + 1;

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.partnerCommissionRule.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
    }
    await tx.partnerCommissionRule.create({
      data: {
        ruleKey,
        version: nextVersion,
        isActive: true,
        name,
        eventType: eventType as never,
        calcType,
        fixedAmountKobo: calcType === "FIXED" ? Math.round(Number(fixedAmountNaira) * 100) : null,
        percentage: calcType === "PERCENTAGE" ? Number(percentage) : null,
        qualificationHoldDays,
        createdById: session.user.id,
      },
    });
  });

  await logPartnerAudit({
    actorUserId: session.user.id,
    action: "COMPENSATION_RULE_UPDATED",
    entityType: "PartnerCommissionRule",
    entityId: ruleKey,
    metadata: { ruleKey, version: nextVersion },
  });

  revalidatePath("/dashboard/admin/partners/compensation");
}
