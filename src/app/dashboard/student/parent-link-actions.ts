"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/admin/audit";

async function loadOwnLink(userId: string, linkId: string) {
  const link = await prisma.parentStudentLink.findUnique({
    where: { id: linkId },
    include: { student: { select: { userId: true } } },
  });
  if (!link || link.student.userId !== userId) {
    throw new Error("This request doesn't belong to your account.");
  }
  return link;
}

export async function approveParentLink(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const linkId = formData.get("linkId") as string;
  const link = await loadOwnLink(session.user.id, linkId);
  if (link.status !== "PENDING") {
    throw new Error("This request has already been responded to.");
  }

  await prisma.parentStudentLink.update({
    where: { id: linkId },
    data: { status: "ACTIVE", respondedAt: new Date() },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: "STUDENT",
    action: "PARENT_LINK_APPROVED",
    resourceType: "ParentStudentLink",
    resourceId: linkId,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/student");
}

export async function rejectParentLink(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const linkId = formData.get("linkId") as string;
  const link = await loadOwnLink(session.user.id, linkId);
  if (link.status !== "PENDING") {
    throw new Error("This request has already been responded to.");
  }

  await prisma.parentStudentLink.update({
    where: { id: linkId },
    data: { status: "REJECTED", respondedAt: new Date() },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: "STUDENT",
    action: "PARENT_LINK_REJECTED",
    resourceType: "ParentStudentLink",
    resourceId: linkId,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/student");
}

export async function removeParentLink(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const linkId = formData.get("linkId") as string;
  const link = await loadOwnLink(session.user.id, linkId);
  if (link.status !== "ACTIVE") {
    throw new Error("This link isn't active.");
  }

  await prisma.parentStudentLink.update({
    where: { id: linkId },
    data: { status: "REMOVED", removedAt: new Date() },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: "STUDENT",
    action: "PARENT_LINK_REMOVED",
    resourceType: "ParentStudentLink",
    resourceId: linkId,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/student");
}
