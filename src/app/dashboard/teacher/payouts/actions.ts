"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherPayoutSettings } from "@/lib/teachers/compensation";
import { generateTeacherPayoutNumber } from "@/lib/teachers/ids";

export async function updatePayoutDestination(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const teacher = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) throw new Error("You don't have a teacher profile.");

  await prisma.teacherProfile.update({
    where: { id: teacher.id },
    data: {
      preferredPaymentMethod: (formData.get("preferredPaymentMethod") as string) || null,
      bankName: (formData.get("bankName") as string)?.trim() || null,
      bankAccountName: (formData.get("bankAccountName") as string)?.trim() || null,
      bankAccountNumber: (formData.get("bankAccountNumber") as string)?.trim() || null,
    },
  });

  revalidatePath("/dashboard/teacher/payouts");
}

export async function requestTeacherPayout(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const teacher = await prisma.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) throw new Error("You don't have a teacher profile.");

  const settings = await getTeacherPayoutSettings();

  const available = await prisma.teacherCommission.aggregate({
    where: { teacherId: teacher.id, status: "AVAILABLE", payoutId: null },
    _sum: { amountKobo: true },
  });
  const availableKobo = available._sum.amountKobo ?? 0;

  if (availableKobo < settings.minimumPayoutKobo) {
    throw new Error(
      `You need at least ₦${(settings.minimumPayoutKobo / 100).toLocaleString()} available to request a payout.`
    );
  }

  const method = (formData.get("method") as string) || teacher.preferredPaymentMethod || "BANK_TRANSFER";

  await prisma.$transaction(async (tx) => {
    const commissions = await tx.teacherCommission.findMany({
      where: { teacherId: teacher.id, status: "AVAILABLE", payoutId: null },
    });

    const payoutNumber = await generateTeacherPayoutNumber();
    const payout = await tx.teacherPayout.create({
      data: {
        payoutNumber,
        teacherId: teacher.id,
        amountKobo: commissions.reduce((acc, c) => acc + c.amountKobo, 0),
        method,
        destinationSnapshot: {
          bankName: teacher.bankName,
          bankAccountName: teacher.bankAccountName,
          bankAccountNumber: teacher.bankAccountNumber,
        },
        status: "REQUESTED",
      },
    });

    await tx.teacherCommission.updateMany({
      where: { id: { in: commissions.map((c) => c.id) } },
      data: { payoutId: payout.id },
    });
  });

  revalidatePath("/dashboard/teacher/payouts");
}
