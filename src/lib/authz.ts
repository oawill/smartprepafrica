import { prisma } from "@/lib/prisma";

/** Shared non-admin authorization guards for Server Actions — same
 * fetch-profile-or-throw shape previously duplicated per file
 * (school/actions.ts, partner/actions.ts, teacher/courses/actions.ts,
 * sponsor/actions.ts). Admin-side authorization stays in
 * src/lib/admin/authz.ts (separate AdminRole/Permission system, unrelated
 * to these per-role profile checks). */

export async function requireSchoolAdmin(userId: string) {
  const school = await prisma.school.findFirst({
    where: { admins: { some: { id: userId } } },
  });
  if (!school) {
    throw new Error("You are not an administrator of any school.");
  }
  return school;
}

export async function requireTeacherProfile(userId: string) {
  const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
  if (!teacher) {
    throw new Error("You don't have a teacher profile.");
  }
  if (teacher.applicationStatus !== "APPROVED") {
    throw new Error("Your teacher application is still under review.");
  }
  return teacher;
}

export async function requireSponsorProfile(userId: string) {
  const sponsor = await prisma.sponsorProfile.findUnique({ where: { userId } });
  if (!sponsor) {
    throw new Error("You don't have a sponsor profile.");
  }
  return sponsor;
}

export async function requireApprovedPartner(userId: string) {
  const partner = await prisma.partner.findUnique({ where: { userId } });
  if (!partner || partner.status !== "APPROVED") {
    throw new Error("You are not an approved partner.");
  }
  return partner;
}
