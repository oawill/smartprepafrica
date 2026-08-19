"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSimpleCsv, generateTempPassword } from "@/lib/csv";
import { redeemVoucherRecord } from "@/lib/vouchers";

async function assertSchoolAdmin(userId: string) {
  const school = await prisma.school.findFirst({
    where: { admins: { some: { id: userId } } },
  });
  if (!school) {
    throw new Error("You are not an administrator of any school.");
  }
  return school;
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

export async function addTeacherByEmail(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const email = (formData.get("teacherEmail") as string)?.trim().toLowerCase();
  const teacher = await prisma.teacherProfile.findFirst({
    where: { user: { email } },
  });
  if (!teacher) {
    throw new Error(
      "No teacher account found with that email. They need to register as a Teacher first."
    );
  }
  if (teacher.schoolId && teacher.schoolId !== school.id) {
    throw new Error("That teacher already belongs to another school.");
  }

  await prisma.teacherProfile.update({
    where: { id: teacher.id },
    data: { schoolId: school.id },
  });

  revalidatePath("/dashboard/school");
}

export async function addStudentByEmail(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const email = (formData.get("studentEmail") as string)?.trim().toLowerCase();
  const student = await prisma.studentProfile.findFirst({
    where: { user: { email } },
  });
  if (!student) {
    throw new Error(
      "No student account found with that email. They need to register as a Student first."
    );
  }
  if (student.schoolId && student.schoolId !== school.id) {
    throw new Error("That student already belongs to another school.");
  }

  await prisma.studentProfile.update({
    where: { id: student.id },
    data: { schoolId: school.id },
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

    await prisma.user.create({
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

    created.push({ row: rowNum, name: name.trim(), email, tempPassword });
  }

  revalidatePath("/dashboard/school");
  return { created, skipped };
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
