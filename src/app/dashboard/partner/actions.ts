"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSchoolLead,
  generateSchoolInvitation,
  updateLeadStage,
} from "@/lib/partners/school-leads";

async function assertApprovedPartner(userId: string) {
  const partner = await prisma.partner.findUnique({ where: { userId } });
  if (!partner || partner.status !== "APPROVED") {
    throw new Error("You are not an approved partner.");
  }
  return partner;
}

export async function addSchoolLead(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const partner = await assertApprovedPartner(session.user.id);

  const schoolName = (formData.get("schoolName") as string)?.trim();
  const contactName = (formData.get("contactName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  if (!schoolName || !contactName || !phone) {
    throw new Error("School name, contact name, and phone are required.");
  }

  const estimatedStudentsRaw = formData.get("estimatedStudents") as string;
  const estimatedTeachersRaw = formData.get("estimatedTeachers") as string;

  await createSchoolLead(partner.id, {
    schoolName,
    contactName,
    phone,
    email: (formData.get("email") as string)?.trim() || undefined,
    state: (formData.get("state") as string)?.trim() || undefined,
    city: (formData.get("city") as string)?.trim() || undefined,
    estimatedStudents: estimatedStudentsRaw ? Number(estimatedStudentsRaw) : undefined,
    estimatedTeachers: estimatedTeachersRaw ? Number(estimatedTeachersRaw) : undefined,
    notes: (formData.get("notes") as string)?.trim() || undefined,
  });

  revalidatePath("/dashboard/partner");
}

export async function setLeadStage(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const partner = await assertApprovedPartner(session.user.id);

  const leadId = formData.get("leadId") as string;
  const toStatus = formData.get("toStatus") as
    | "CONTACTED"
    | "DEMO_SCHEDULED"
    | "NEGOTIATING"
    | "LOST";
  const note = (formData.get("note") as string)?.trim() || undefined;

  await updateLeadStage(leadId, partner.id, toStatus, note, session.user.id);
  revalidatePath("/dashboard/partner");
}

export async function requestInvitationLink(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const partner = await assertApprovedPartner(session.user.id);

  const leadId = formData.get("leadId") as string;
  await generateSchoolInvitation(leadId, partner.id);
  revalidatePath("/dashboard/partner");
}

export async function markNotificationRead(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const partner = await assertApprovedPartner(session.user.id);

  const notificationId = formData.get("notificationId") as string;
  await prisma.partnerNotification.updateMany({
    where: { id: notificationId, partnerId: partner.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/partner");
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session) redirect("/login");
  const partner = await assertApprovedPartner(session.user.id);

  await prisma.partnerNotification.updateMany({
    where: { partnerId: partner.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/partner");
}
