"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SubscriptionPlan } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiateSubscriptionCheckout } from "@/lib/paystack";
import { logAudit } from "@/lib/admin/audit";

/** Requests a link to a student by their link code — this only creates a
 * PENDING request; the student must approve it (see
 * src/app/dashboard/student/parent-link-actions.ts) before the parent gains
 * any access to that student's data. Replaces the old email-based instant
 * link, which let any parent attach themselves to any student with no
 * consent. */
export async function requestChildLink(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const linkCode = (formData.get("linkCode") as string)?.trim().toUpperCase();
  const relationship = (formData.get("relationship") as string)?.trim() || null;
  if (!linkCode) {
    throw new Error("Enter your child's link code.");
  }

  const student = await prisma.studentProfile.findUnique({ where: { linkCode } });
  if (!student) {
    throw new Error("No student found with that link code. Double-check it with your child.");
  }

  const existing = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId: session.user.id, studentId: student.id } },
  });

  if (existing?.status === "PENDING") {
    throw new Error("You've already sent a request for this student — waiting on their approval.");
  }
  if (existing?.status === "ACTIVE") {
    throw new Error("This student is already linked to your account.");
  }

  const link = await prisma.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId: session.user.id, studentId: student.id } },
    update: { status: "PENDING", relationship, requestedAt: new Date(), respondedAt: null, removedAt: null },
    create: { parentId: session.user.id, studentId: student.id, relationship },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: "PARENT",
    action: "PARENT_LINK_REQUESTED",
    resourceType: "ParentStudentLink",
    resourceId: link.id,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/parent");
}

async function assertLinkedChild(parentId: string, studentProfileId: string) {
  const link = await prisma.parentStudentLink.findUnique({
    where: {
      parentId_studentId: { parentId, studentId: studentProfileId },
    },
  });
  if (!link || link.status !== "ACTIVE") {
    throw new Error("This student isn't linked to your account.");
  }
}

export async function checkoutForChild(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const studentProfileId = formData.get("studentProfileId") as string;
  const plan = formData.get("plan") as SubscriptionPlan;

  await assertLinkedChild(session.user.id, studentProfileId);

  const studentProfile = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentProfileId },
    select: { userId: true },
  });

  let authorizationUrl: string;
  try {
    authorizationUrl = await initiateSubscriptionCheckout({
      payerId: session.user.id,
      payerEmail: session.user.email!,
      plan,
      beneficiaryUserId: studentProfile.userId,
    });
  } catch {
    redirect(`/dashboard/parent/children/${studentProfileId}?status=error`);
  }

  redirect(authorizationUrl);
}
