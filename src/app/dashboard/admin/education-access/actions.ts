"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";

export async function setInquiryStatus(formData: FormData) {
  await requireActionPermission("education_access.manage");
  const inquiryId = formData.get("inquiryId") as string;
  const status = formData.get("status") as
    | "NEW"
    | "CONTACTED"
    | "UNDER_REVIEW"
    | "PARTNER_CONFIRMED"
    | "SPONSORED"
    | "CLOSED";

  await prisma.educationAccessInquiry.update({
    where: { id: inquiryId },
    data: { status },
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
