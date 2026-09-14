"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";

export async function setInquiryStatus(formData: FormData) {
  await requireActionPermission("education_access.manage");
  const inquiryId = formData.get("inquiryId") as string;
  const status = formData.get("status") as
    | "INQUIRY"
    | "CONTACTED"
    | "PROPOSAL_SENT"
    | "UNDER_REVIEW"
    | "CONFIRMED"
    | "ACTIVE"
    | "COMPLETED"
    | "CLOSED";

  await prisma.educationAccessInquiry.update({
    where: { id: inquiryId },
    data: { status },
  });

  revalidatePath("/dashboard/admin/education-access");
}

export async function updateInquiryDetails(formData: FormData) {
  await requireActionPermission("education_access.manage");
  const inquiryId = formData.get("inquiryId") as string;
  const amountRaw = formData.get("amountMinor") as string;
  const currency = formData.get("currency") as string;
  const paymentStatus = formData.get("paymentStatus") as
    | "NOT_REQUIRED"
    | "PENDING"
    | "PAID"
    | "PARTIALLY_PAID"
    | "REFUNDED";
  const internalNotes = formData.get("internalNotes") as string;
  const programId = formData.get("programId") as string;

  await prisma.educationAccessInquiry.update({
    where: { id: inquiryId },
    data: {
      amountMinor: amountRaw ? Number(amountRaw) : null,
      currency: currency || null,
      paymentStatus,
      internalNotes: internalNotes || null,
      programId: programId || null,
    },
  });

  revalidatePath("/dashboard/admin/education-access");
}

export async function assignInquiry(formData: FormData) {
  const session = await requireActionPermission("education_access.manage");
  const inquiryId = formData.get("inquiryId") as string;
  const assignToSelf = formData.get("assignToSelf") === "on";

  await prisma.educationAccessInquiry.update({
    where: { id: inquiryId },
    data: {
      assignedToId: assignToSelf ? session.user.id : null,
      status: assignToSelf ? "CONTACTED" : undefined,
    },
  });

  revalidatePath("/dashboard/admin/education-access");
}
