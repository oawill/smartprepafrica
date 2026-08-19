"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function assertAdmin() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    throw new Error("Only platform administrators can do that.");
  }
  return session;
}

export async function setSubmissionStatus(formData: FormData) {
  await assertAdmin();
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
  const session = await assertAdmin();
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
