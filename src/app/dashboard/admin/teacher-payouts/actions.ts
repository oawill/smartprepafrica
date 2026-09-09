"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { logAudit } from "@/lib/admin/audit";
import { requireActionPermission } from "@/lib/admin/authz";

export async function approveTeacherPayout(formData: FormData) {
  const session = await requireActionPermission("teachers.payout");
  const payoutId = formData.get("payoutId") as string;

  const payout = await prisma.teacherPayout.findUniqueOrThrow({
    where: { id: payoutId },
    include: { teacher: { select: { userId: true } } },
  });
  if (payout.status !== "REQUESTED") return;

  await prisma.teacherPayout.update({
    where: { id: payoutId },
    data: { status: "APPROVED", approvedAt: new Date(), approvedById: session.user.id },
  });

  await notifyUser(
    payout.teacher.userId,
    "TEACHER_PAYOUT_APPROVED",
    `Your payout request ${payout.payoutNumber} was approved and is being processed.`,
    "/dashboard/teacher/payouts"
  );
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TEACHER_PAYOUT_APPROVED",
    resourceType: "TeacherPayout",
    resourceId: payoutId,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/admin/teacher-payouts");
}

// Never marks a payout PAID until the admin explicitly confirms the
// transfer actually happened — this action IS that confirmation step,
// not an automatic follow-on to approval.
export async function markTeacherPayoutPaid(formData: FormData) {
  const session = await requireActionPermission("teachers.payout");
  const payoutId = formData.get("payoutId") as string;

  const payout = await prisma.teacherPayout.findUniqueOrThrow({
    where: { id: payoutId },
    include: { teacher: { select: { userId: true } } },
  });
  if (payout.status !== "APPROVED") return;

  await prisma.$transaction(async (tx) => {
    await tx.teacherPayout.update({
      where: { id: payoutId },
      data: { status: "PAID", paidAt: new Date() },
    });
    await tx.teacherCommission.updateMany({
      where: { payoutId },
      data: { status: "PAID", paidAt: new Date() },
    });
  });

  await notifyUser(
    payout.teacher.userId,
    "TEACHER_PAYOUT_COMPLETED",
    `Your payout ${payout.payoutNumber} has been paid.`,
    "/dashboard/teacher/payouts"
  );
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TEACHER_PAYOUT_PAID",
    resourceType: "TeacherPayout",
    resourceId: payoutId,
    result: "SUCCESS",
  });

  revalidatePath("/dashboard/admin/teacher-payouts");
}

export async function rejectTeacherPayout(formData: FormData) {
  const session = await requireActionPermission("teachers.payout");
  const payoutId = formData.get("payoutId") as string;
  const reason = (formData.get("reason") as string)?.trim() || "Not specified";

  const payout = await prisma.teacherPayout.findUniqueOrThrow({
    where: { id: payoutId },
    include: { teacher: { select: { userId: true } } },
  });
  if (payout.status !== "REQUESTED" && payout.status !== "APPROVED") return;

  await prisma.$transaction(async (tx) => {
    await tx.teacherPayout.update({
      where: { id: payoutId },
      data: { status: "REJECTED", rejectedReason: reason },
    });
    // Release the commissions back to AVAILABLE so the teacher can
    // request a payout for them again.
    await tx.teacherCommission.updateMany({
      where: { payoutId },
      data: { payoutId: null },
    });
  });

  await notifyUser(
    payout.teacher.userId,
    "TEACHER_PAYOUT_REJECTED",
    `Your payout request ${payout.payoutNumber} was rejected: ${reason}`,
    "/dashboard/teacher/payouts"
  );
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TEACHER_PAYOUT_REJECTED",
    resourceType: "TeacherPayout",
    resourceId: payoutId,
    result: "SUCCESS",
    after: { reason },
  });

  revalidatePath("/dashboard/admin/teacher-payouts");
}

export async function updateTeacherPayoutSettings(formData: FormData) {
  const session = await requireActionPermission("teachers.payout");

  const minimumPayoutKobo = Math.round(Number(formData.get("minimumPayoutNaira")) * 100);
  const commissionPerEnrollmentKobo = Math.round(Number(formData.get("commissionPerEnrollmentNaira")) * 100);

  if (!Number.isFinite(minimumPayoutKobo) || !Number.isFinite(commissionPerEnrollmentKobo)) {
    throw new Error("Enter valid amounts.");
  }

  await prisma.teacherPayoutSettings.upsert({
    where: { id: 1 },
    update: { minimumPayoutKobo, commissionPerEnrollmentKobo },
    create: { id: 1, minimumPayoutKobo, commissionPerEnrollmentKobo },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TEACHER_PAYOUT_SETTINGS_UPDATED",
    resourceType: "TeacherPayoutSettings",
    result: "SUCCESS",
    after: { minimumPayoutKobo, commissionPerEnrollmentKobo },
  });

  revalidatePath("/dashboard/admin/teacher-payouts");
}
