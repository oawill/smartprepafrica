"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logPartnerAudit } from "@/lib/partners/audit";
import { requireActionPermission } from "@/lib/admin/authz";

export async function suspendPartner(formData: FormData) {
  const session = await requireActionPermission("partners.approve");
  const partnerId = formData.get("partnerId") as string;
  const reason = (formData.get("reason") as string)?.trim() || null;

  await prisma.partner.update({
    where: { id: partnerId },
    data: { status: "SUSPENDED", suspendedReason: reason },
  });
  await logPartnerAudit({
    actorUserId: session.user.id,
    action: "PARTNER_SUSPENDED",
    entityType: "Partner",
    entityId: partnerId,
    metadata: { reason },
  });
  revalidatePath(`/dashboard/admin/partners/${partnerId}`);
}

export async function reactivatePartner(formData: FormData) {
  const session = await requireActionPermission("partners.approve");
  const partnerId = formData.get("partnerId") as string;

  await prisma.partner.update({
    where: { id: partnerId },
    data: { status: "APPROVED", suspendedReason: null },
  });
  await logPartnerAudit({
    actorUserId: session.user.id,
    action: "PARTNER_REACTIVATED",
    entityType: "Partner",
    entityId: partnerId,
  });
  revalidatePath(`/dashboard/admin/partners/${partnerId}`);
}

export async function closePartner(formData: FormData) {
  const session = await requireActionPermission("partners.approve");
  const partnerId = formData.get("partnerId") as string;

  await prisma.partner.update({ where: { id: partnerId }, data: { status: "CLOSED" } });
  await logPartnerAudit({
    actorUserId: session.user.id,
    action: "PARTNER_CLOSED",
    entityType: "Partner",
    entityId: partnerId,
  });
  revalidatePath(`/dashboard/admin/partners/${partnerId}`);
}

export async function saveAdminNotes(formData: FormData) {
  const session = await requireActionPermission("partners.approve");
  const partnerId = formData.get("partnerId") as string;
  const adminNotes = (formData.get("adminNotes") as string) ?? "";

  await prisma.partner.update({ where: { id: partnerId }, data: { adminNotes } });
  await logPartnerAudit({
    actorUserId: session.user.id,
    action: "PARTNER_NOTES_UPDATED",
    entityType: "Partner",
    entityId: partnerId,
  });
  revalidatePath(`/dashboard/admin/partners/${partnerId}`);
}
