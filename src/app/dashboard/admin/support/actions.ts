"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";

export async function setSubmissionStatus(formData: FormData) {
  await requireActionPermission("support.manage");
  const submissionId = formData.get("submissionId") as string;
  const status = formData.get("status") as
    | "NEW"
    | "IN_REVIEW"
    | "RESPONDED"
    | "RESOLVED"
    | "CLOSED";

  await prisma.contactSubmission.update({
    where: { id: submissionId },
    data: { status },
  });

  revalidatePath("/dashboard/admin/support");
}

export async function assignSubmission(formData: FormData) {
  const session = await requireActionPermission("support.manage");
  const submissionId = formData.get("submissionId") as string;
  const assignToSelf = formData.get("assignToSelf") === "on";

  await prisma.contactSubmission.update({
    where: { id: submissionId },
    data: {
      assignedToId: assignToSelf ? session.user.id : null,
      status: assignToSelf ? "IN_REVIEW" : undefined,
    },
  });

  revalidatePath("/dashboard/admin/support");
}
