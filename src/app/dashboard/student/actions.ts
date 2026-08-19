"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redeemVoucherRecord } from "@/lib/vouchers";

export async function redeemVoucher(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const code = (formData.get("code") as string)?.trim().toUpperCase();
  if (!code) {
    throw new Error("Enter a voucher code.");
  }

  const voucher = await prisma.voucher.findUnique({ where: { code } });
  if (!voucher) {
    throw new Error("That voucher code wasn't found.");
  }

  await redeemVoucherRecord(voucher.id, session.user.id);

  revalidatePath("/dashboard/student");
}
