"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSimpleCsv, generateTempPassword } from "@/lib/csv";
import { redeemVoucherRecord } from "@/lib/vouchers";
import { logAudit } from "@/lib/admin/audit";
import { requireSchoolAdmin as assertSchoolAdmin } from "@/lib/authz";
import { generateJoinCode, generateJoinPin } from "@/lib/registration/school-join-code";
import { Prisma } from "@prisma/client";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Enrolls one student into every course currently assigned to their class.
 * Called both when a student joins a class and (in the other direction)
 * when a course is newly assigned to a class — skips anyone already
 * enrolled rather than erroring. */
async function enrollStudentInClassCourses(userId: string, classId: string) {
  const assignments = await prisma.classCourseAssignment.findMany({ where: { classId } });
  if (assignments.length === 0) return;
  await prisma.courseEnrollment.createMany({
    data: assignments.map((a) => ({ userId, courseId: a.courseId })),
    skipDuplicates: true,
  });
}

export async function updateSchoolProfile(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("School name is required.");

  await prisma.school.update({
    where: { id: school.id },
    data: {
      name,
      address: (formData.get("address") as string)?.trim() || null,
      logoUrl: (formData.get("logoUrl") as string)?.trim() || null,
      state: (formData.get("state") as string)?.trim() || null,
      coverImageUrl: (formData.get("coverImageUrl") as string)?.trim() || null,
      description: (formData.get("description") as string)?.trim() || null,
    },
  });

  revalidatePath("/dashboard/school");
}

/** Generates (or rotates) this school's standing join code+PIN — the
 * Door 2 self-registration path (docs/migration-plan.md Revised Phase
 * 3), distinct from the per-invitee links below. Retries on a
 * collision the same way createUniqueVoucher does
 * (dashboard/sponsor/actions.ts). */
export async function regenerateSchoolJoinCode() {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  let updated;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      updated = await prisma.school.update({
        where: { id: school.id },
        data: { joinCode: generateJoinCode(), joinPin: generateJoinPin() },
      });
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue; // joinCode collision — retry with a fresh one.
      }
      throw error;
    }
  }
  if (!updated) throw new Error("Could not generate a unique join code. Try again.");

  await logAudit({
    actorUserId: session.user.id,
    actorRole: "SCHOOL_ADMIN",
    action: "SCHOOL_JOIN_CODE_REGENERATED",
    resourceType: "School",
    resourceId: school.id,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/school");
}

export type InviteResult = { token: string; alreadyHasAccount: boolean } | { error: string };

async function createOrResendInvite(
  school: { id: string },
  invitedById: string,
  role: "TEACHER" | "STUDENT",
  email: string,
  classId: string | null
): Promise<InviteResult> {
  if (!email) return { error: "Enter an email address." };

  if (classId) {
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.schoolId !== school.id) {
      return { error: "Selected class not found in your school." };
    }
  }

  const invitationToken = randomUUID();
  const invitationExpiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

  const existingPending = await prisma.schoolInvitation.findFirst({
    where: { schoolId: school.id, inviteeEmail: email, status: "PENDING" },
  });

  const invitation = existingPending
    ? await prisma.schoolInvitation.update({
        where: { id: existingPending.id },
        data: { invitationToken, invitationExpiresAt, classId },
      })
    : await prisma.schoolInvitation.create({
        data: {
          schoolId: school.id,
          inviteeEmail: email,
          role,
          classId,
          invitationToken,
          invitationExpiresAt,
          invitedById,
        },
      });

  await logAudit({
    actorUserId: invitedById,
    actorRole: "SCHOOL_ADMIN",
    action: existingPending ? "SCHOOL_INVITE_RESENT" : "SCHOOL_INVITE_CREATED",
    resourceType: "SchoolInvitation",
    resourceId: invitation.id,
    result: "SUCCESS",
  });

  const alreadyHasAccount = !!(await prisma.user.findUnique({ where: { email } }));

  revalidatePath("/dashboard/school");
  return { token: invitation.invitationToken, alreadyHasAccount };
}

export async function inviteTeacher(
  _prevState: InviteResult | null,
  formData: FormData
): Promise<InviteResult> {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const email = (formData.get("teacherEmail") as string)?.trim().toLowerCase();
  return createOrResendInvite(school, session.user.id, "TEACHER", email, null);
}

export async function inviteStudent(
  _prevState: InviteResult | null,
  formData: FormData
): Promise<InviteResult> {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const email = (formData.get("studentEmail") as string)?.trim().toLowerCase();
  const classId = (formData.get("classId") as string) || null;
  return createOrResendInvite(school, session.user.id, "STUDENT", email, classId);
}

export async function revokeSchoolInvitation(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const invitationId = formData.get("invitationId") as string;
  const invitation = await prisma.schoolInvitation.findUnique({ where: { id: invitationId } });
  if (!invitation || invitation.schoolId !== school.id || invitation.status !== "PENDING") {
    throw new Error("Invitation not found.");
  }

  await prisma.schoolInvitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED", respondedAt: new Date() },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: "SCHOOL_ADMIN",
    action: "SCHOOL_INVITE_REVOKED",
    resourceType: "SchoolInvitation",
    resourceId: invitationId,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/school");
}

export async function createClass(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const name = (formData.get("className") as string)?.trim();
  if (!name) throw new Error("Class name is required.");

  await prisma.class.create({ data: { schoolId: school.id, name } });

  revalidatePath("/dashboard/school");
}

export async function assignStudentToClass(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const studentProfileId = formData.get("studentProfileId") as string;
  const classId = formData.get("classId") as string;

  const [student, cls] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { id: studentProfileId } }),
    prisma.class.findUnique({ where: { id: classId } }),
  ]);
  if (!student || student.schoolId !== school.id) {
    throw new Error("Student not found in your school.");
  }
  if (!cls || cls.schoolId !== school.id) {
    throw new Error("Class not found in your school.");
  }

  await prisma.studentProfile.update({
    where: { id: studentProfileId },
    data: { classId },
  });
  await enrollStudentInClassCourses(student.userId, classId);

  revalidatePath(`/dashboard/school/classes/${classId}`);
  revalidatePath("/dashboard/school");
}

export async function assignTeacherToClass(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const teacherProfileId = formData.get("teacherProfileId") as string;
  const classId = formData.get("classId") as string;

  const [teacher, cls] = await Promise.all([
    prisma.teacherProfile.findUnique({ where: { id: teacherProfileId } }),
    prisma.class.findUnique({ where: { id: classId } }),
  ]);
  if (!teacher || teacher.schoolId !== school.id) {
    throw new Error("Teacher not found in your school.");
  }
  if (!cls || cls.schoolId !== school.id) {
    throw new Error("Class not found in your school.");
  }

  await prisma.class.update({
    where: { id: classId },
    data: { teachers: { connect: { id: teacherProfileId } } },
  });

  revalidatePath(`/dashboard/school/classes/${classId}`);
}

export type BulkUploadResult = {
  created: { row: number; name: string; email: string; tempPassword: string }[];
  skipped: { row: number; email: string; reason: string }[];
};

/**
 * Bulk-creates student accounts from a CSV of name,email rows. There is no
 * transactional email sending configured in this app, so generated
 * passwords are returned to the admin to hand-deliver — they are NOT
 * emailed anywhere. This is a real gap for production use, not a shortcut
 * silently papered over: the UI must make clear these are one-time-visible
 * temporary credentials.
 */
export async function bulkUploadStudents(
  _prevState: BulkUploadResult | null,
  formData: FormData
): Promise<BulkUploadResult> {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const file = formData.get("csvFile") as File | null;
  const classId = (formData.get("classId") as string) || null;

  if (!file || file.size === 0) {
    return { created: [], skipped: [{ row: 0, email: "", reason: "No file selected." }] };
  }

  if (classId) {
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.schoolId !== school.id) {
      return {
        created: [],
        skipped: [{ row: 0, email: "", reason: "Selected class not found in your school." }],
      };
    }
  }

  const text = await file.text();
  const rows = parseSimpleCsv(text);
  const dataRows =
    rows[0]?.[0]?.toLowerCase() === "name" && rows[0]?.[1]?.toLowerCase() === "email"
      ? rows.slice(1)
      : rows;

  const created: BulkUploadResult["created"] = [];
  const skipped: BulkUploadResult["skipped"] = [];

  for (const [i, row] of dataRows.entries()) {
    const rowNum = i + 1;
    const [name, emailRaw] = row;
    const email = emailRaw?.trim().toLowerCase();

    if (!name?.trim() || !email) {
      skipped.push({ row: rowNum, email: email ?? "", reason: "Missing name or email." });
      continue;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      skipped.push({ row: rowNum, email, reason: "An account with this email already exists." });
      continue;
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email,
        passwordHash,
        role: "STUDENT",
        studentProfile: {
          create: { schoolId: school.id, classId: classId ?? undefined },
        },
      },
    });
    if (classId) {
      await enrollStudentInClassCourses(newUser.id, classId);
    }

    created.push({ row: rowNum, name: name.trim(), email, tempPassword });
  }

  revalidatePath("/dashboard/school");
  return { created, skipped };
}

export async function assignCourseToClass(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const classId = formData.get("classId") as string;
  const courseId = formData.get("courseId") as string;
  const dueAtRaw = formData.get("dueAt") as string;
  const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;

  const [cls, course] = await Promise.all([
    prisma.class.findUnique({ where: { id: classId }, include: { students: true } }),
    prisma.course.findUnique({ where: { id: courseId } }),
  ]);
  if (!cls || cls.schoolId !== school.id) {
    throw new Error("Class not found in your school.");
  }
  if (!course || course.schoolId !== school.id) {
    throw new Error("Course not found in your school.");
  }

  const assignment = await prisma.classCourseAssignment.upsert({
    where: { classId_courseId: { classId, courseId } },
    update: { dueAt },
    create: { classId, courseId, assignedById: session.user.id, dueAt },
  });

  await prisma.courseEnrollment.createMany({
    data: cls.students.map((s) => ({ userId: s.userId, courseId })),
    skipDuplicates: true,
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: "SCHOOL_ADMIN",
    action: "CLASS_COURSE_ASSIGNED",
    resourceType: "ClassCourseAssignment",
    resourceId: assignment.id,
    result: "SUCCESS",
    after: { classId, courseId },
  });

  revalidatePath(`/dashboard/school/classes/${classId}`);
}

/** Removes the cohort-curation link only — existing CourseEnrollment rows
 * for students already enrolled are left untouched, so nobody's progress
 * or access disappears just because an admin changed what's assigned. */
export async function unassignCourseFromClass(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const classId = formData.get("classId") as string;
  const courseId = formData.get("courseId") as string;

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls || cls.schoolId !== school.id) {
    throw new Error("Class not found in your school.");
  }

  await prisma.classCourseAssignment.deleteMany({ where: { classId, courseId } });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: "SCHOOL_ADMIN",
    action: "CLASS_COURSE_UNASSIGNED",
    resourceType: "ClassCourseAssignment",
    result: "SUCCESS",
    after: { classId, courseId },
  });

  revalidatePath(`/dashboard/school/classes/${classId}`);
}

export async function assignSponsoredSeat(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const programId = formData.get("programId") as string;
  const studentProfileId = formData.get("studentProfileId") as string;

  const program = await prisma.sponsorshipProgram.findUnique({ where: { id: programId } });
  if (!program || program.schoolId !== school.id) {
    throw new Error("Sponsorship program not found.");
  }

  const student = await prisma.studentProfile.findUnique({ where: { id: studentProfileId } });
  if (!student || student.schoolId !== school.id) {
    throw new Error("Student not found in your school.");
  }

  const availableVoucher = await prisma.voucher.findFirst({
    where: { programId, status: "ACTIVE" },
  });
  if (!availableVoucher) {
    throw new Error("No available seats left in this program.");
  }

  await redeemVoucherRecord(availableVoucher.id, student.userId);

  revalidatePath("/dashboard/school");
}
