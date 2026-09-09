"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSimpleCsv, generateTempPassword } from "@/lib/csv";
import { redeemVoucherRecord } from "@/lib/vouchers";
import { requireSchoolAdmin as assertSchoolAdmin } from "@/lib/authz";
import { initiateSchoolLicenseCheckout } from "@/lib/schools/license-checkout";

/** Same shape as the private helper in src/app/dashboard/school/actions.ts
 * — duplicated rather than exported across files for one small function,
 * matching this session's established per-domain duplication precedent. */
async function enrollStudentInClassCourses(userId: string, classId: string) {
  const assignments = await prisma.classCourseAssignment.findMany({ where: { classId } });
  if (assignments.length === 0) return;
  await prisma.courseEnrollment.createMany({
    data: assignments.map((a) => ({ userId, courseId: a.courseId })),
    skipDuplicates: true,
  });
}

/** Starts a real Paystack checkout for a block of SCHOOL-plan seats and
 * redirects the admin there — same shape as src/app/pricing/actions.ts's
 * checkout(). Seats are only issued once the payment actually succeeds
 * (see activateSchoolLicensePurchaseForReference). */
export async function purchaseSchoolLicenses(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const seatCount = Number(formData.get("seatCount"));
  const durationDays = Number(formData.get("durationDays"));

  let authorizationUrl: string;
  try {
    authorizationUrl = await initiateSchoolLicenseCheckout({
      payerId: session.user.id,
      payerEmail: session.user.email!,
      schoolId: school.id,
      seatCount,
      durationDays,
    });
  } catch {
    redirect("/dashboard/school?license=error");
  }

  redirect(authorizationUrl);
}

/** Assigns one already-purchased, unredeemed seat to an existing student
 * — near-duplicate of assignSponsoredSeat in actions.ts, but the seat
 * pool is every ACTIVE voucher from any of this school's license
 * purchases (not scoped to one program), since a school's seats are one
 * shared pool, not per-purchase batches. */
export async function assignSchoolLicenseSeat(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const school = await assertSchoolAdmin(session.user.id);

  const studentProfileId = formData.get("studentProfileId") as string;

  const student = await prisma.studentProfile.findUnique({ where: { id: studentProfileId } });
  if (!student || student.schoolId !== school.id) {
    throw new Error("Student not found in your school.");
  }

  const availableVoucher = await prisma.voucher.findFirst({
    where: { status: "ACTIVE", schoolLicensePurchase: { schoolId: school.id } },
  });
  if (!availableVoucher) {
    throw new Error("No available licence seats left.");
  }

  await redeemVoucherRecord(availableVoucher.id, student.userId);

  revalidatePath("/dashboard/school");
}

export type BulkAssignLicensesResult = {
  created: { row: number; name: string; email: string; tempPassword: string }[];
  skipped: { row: number; email: string; reason: string }[];
};

/** Same CSV parsing/reporting shape as bulkUploadStudents, but each
 * created student is immediately redeemed a licence seat too — a row is
 * skipped with "No seats left" once the pool is exhausted mid-file
 * rather than silently creating an unlicensed account. */
export async function bulkAssignSchoolLicenses(
  _prevState: BulkAssignLicensesResult | null,
  formData: FormData
): Promise<BulkAssignLicensesResult> {
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

  const created: BulkAssignLicensesResult["created"] = [];
  const skipped: BulkAssignLicensesResult["skipped"] = [];

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

    const availableVoucher = await prisma.voucher.findFirst({
      where: { status: "ACTIVE", schoolLicensePurchase: { schoolId: school.id } },
    });
    if (!availableVoucher) {
      skipped.push({ row: rowNum, email, reason: "No seats left." });
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

    await redeemVoucherRecord(availableVoucher.id, newUser.id);

    created.push({ row: rowNum, name: name.trim(), email, tempPassword });
  }

  revalidatePath("/dashboard/school");
  return { created, skipped };
}
