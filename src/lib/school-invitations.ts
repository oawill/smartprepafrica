import type { Prisma } from "@prisma/client";

// Mirrors registerSchoolFromInvitation's shape (src/lib/partners/school-leads.ts) —
// re-validates the token at registration time rather than trusting the query
// param the client carried forward.
export async function registerStaffFromInvitation(
  tx: Prisma.TransactionClient,
  invitationToken: string,
  role: "TEACHER" | "STUDENT",
  userId: string
) {
  const invite = await tx.schoolInvitation.findUnique({ where: { invitationToken } });
  if (!invite) throw new Error("This invitation link is invalid.");
  if (invite.role !== role) throw new Error("This invitation is for a different account type.");
  if (invite.status !== "PENDING") throw new Error("This invitation has already been used.");
  if (invite.invitationExpiresAt < new Date()) throw new Error("This invitation link has expired.");

  if (role === "TEACHER") {
    await tx.teacherProfile.create({ data: { userId, schoolId: invite.schoolId } });
  } else {
    await tx.studentProfile.create({
      data: { userId, schoolId: invite.schoolId, classId: invite.classId },
    });
  }

  await tx.schoolInvitation.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });

  return invite;
}
