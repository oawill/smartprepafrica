"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePartnerNumber, referralCodeFromPartnerNumber } from "@/lib/partners/ids";
import { logPartnerAudit } from "@/lib/partners/audit";
import { notifyPartner } from "@/lib/partners/notify";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

export async function approvePartner(formData: FormData) {
  const session = await requireActionPermission("partners.approve");

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

/** Admin-mediated only, deliberately not self-service — holding a second
 * role (a teacher who's also a parent) is a real-world fact an admin
 * confirms, not something a user grants themselves. */
export async function grantAdditionalRole(formData: FormData) {
  const session = await requireActionPermission("roles.manage");

  const targetUserId = formData.get("userId") as string;
  const newRole = formData.get("role") as Role;

  const existing = await prisma.userRole.findUnique({
    where: { userId_role: { userId: targetUserId, role: newRole } },
  });
  if (existing) return;

  await prisma.userRole.create({ data: { userId: targetUserId, role: newRole } });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "ROLE_GRANTED",
    resourceType: "User",
    resourceId: targetUserId,
    result: "SUCCESS",
    after: { role: newRole },
  });

  revalidatePath(`/dashboard/admin/users`);
}

export async function rejectPartner(formData: FormData) {
  const session = await requireActionPermission("partners.approve");

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
