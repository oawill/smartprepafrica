"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/admin/audit";

async function loadOwnInvitation(userEmail: string, invitationId: string) {
  const invitation = await prisma.schoolInvitation.findUnique({ where: { id: invitationId } });
  if (!invitation || invitation.inviteeEmail !== userEmail.toLowerCase()) {
    throw new Error("This invitation doesn't belong to your account.");
  }
  if (invitation.status !== "PENDING") {
    throw new Error("This invitation has already been responded to.");
  }
  if (invitation.invitationExpiresAt < new Date()) {
    await prisma.schoolInvitation.update({ where: { id: invitationId }, data: { status: "EXPIRED" } });
    throw new Error("This invitation has expired.");
  }
  return invitation;
}

export async function acceptSchoolInvitation(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const invitationId = formData.get("invitationId") as string;
  const invitation = await loadOwnInvitation(session.user.email!, invitationId);

  if (invitation.role === "TEACHER") {
    const teacher = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
    if (!teacher) throw new Error("No teacher profile found on your account.");
    if (teacher.schoolId && teacher.schoolId !== invitation.schoolId) {
      throw new Error("You already belong to a different school.");
    }
    await prisma.teacherProfile.update({
      where: { id: teacher.id },
      data: { schoolId: invitation.schoolId },
    });
  } else {
    const student = await prisma.studentProfile.findUnique({ where: { userId: session.user.id } });
    if (!student) throw new Error("No student profile found on your account.");
    if (student.schoolId && student.schoolId !== invitation.schoolId) {
      throw new Error("You already belong to a different school.");
    }
    await prisma.studentProfile.update({
      where: { id: student.id },
      data: { schoolId: invitation.schoolId, classId: invitation.classId ?? student.classId },
    });
  }

  await prisma.schoolInvitation.update({
    where: { id: invitationId },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: invitation.role,
    action: "SCHOOL_INVITE_ACCEPTED",
    resourceType: "SchoolInvitation",
    resourceId: invitationId,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/student");
}

export async function declineSchoolInvitation(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const invitationId = formData.get("invitationId") as string;
  const invitation = await loadOwnInvitation(session.user.email!, invitationId);

  await prisma.schoolInvitation.update({
    where: { id: invitationId },
    data: { status: "DECLINED", respondedAt: new Date() },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: invitation.role,
    action: "SCHOOL_INVITE_DECLINED",
    resourceType: "SchoolInvitation",
    resourceId: invitationId,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/student");
}
