import { prisma } from "@/lib/prisma";

/** Redeems a specific voucher for a user: marks it REDEEMED, records who
 * redeemed it, and activates a 30-day subscription on the voucher's plan.
 * Throws on an inactive or expired voucher (and flips expired ones to
 * EXPIRED as a side effect) rather than silently succeeding. */
export async function redeemVoucherRecord(voucherId: string, userId: string) {
  const voucher = await prisma.voucher.findUniqueOrThrow({ where: { id: voucherId } });

  if (voucher.status !== "ACTIVE") {
    throw new Error("That voucher has already been redeemed or is no longer active.");
  }
  if (voucher.expiresAt && voucher.expiresAt < new Date()) {
    await prisma.voucher.update({ where: { id: voucher.id }, data: { status: "EXPIRED" } });
    throw new Error("That voucher has expired.");
  }

  await prisma.$transaction([
    prisma.voucherRedemption.create({
      data: { voucherId: voucher.id, userId },
    }),
    prisma.voucher.update({
      where: { id: voucher.id },
      data: { status: "REDEEMED" },
    }),
    prisma.subscription.create({
      data: {
        userId,
        plan: voucher.plan,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);
}
