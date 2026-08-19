"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SubscriptionPlan } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiateSubscriptionCheckout } from "@/lib/paystack";

export async function linkChild(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const childEmail = (formData.get("childEmail") as string)?.trim().toLowerCase();
  if (!childEmail) {
    throw new Error("Enter your child's email address.");
  }

  const childUser = await prisma.user.findUnique({
    where: { email: childEmail },
    include: { studentProfile: true },
  });

  if (!childUser || !childUser.studentProfile) {
    throw new Error(
      "No student account found with that email. They need to register as a student first."
    );
  }

  await prisma.parentStudentLink.upsert({
    where: {
      parentId_studentId: {
        parentId: session.user.id,
        studentId: childUser.studentProfile.id,
      },
    },
    update: {},
    create: {
      parentId: session.user.id,
      studentId: childUser.studentProfile.id,
    },
  });

  revalidatePath("/dashboard/parent");
}

async function assertLinkedChild(parentId: string, studentProfileId: string) {
  const link = await prisma.parentStudentLink.findUnique({
    where: {
      parentId_studentId: { parentId, studentId: studentProfileId },
    },
  });
  if (!link) {
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
