import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Redeems a specific voucher for a user: marks it REDEEMED, records who
 * redeemed it, and activates a 30-day subscription on the voucher's plan.
 * Throws on an inactive or expired voucher (and flips expired ones to
 * EXPIRED as a side effect) rather than silently succeeding.
 *
 * `client` defaults to the top-level `prisma` (every existing call site's
 * behavior, unchanged) but accepts a `Prisma.TransactionClient` so a
 * caller already inside its own transaction — e.g. registration-time
 * redemption in create-student-account.ts — can compose this atomically
 * rather than opening a second, independent transaction. A
 * TransactionClient has no array-form `$transaction`, so the three
 * writes run as plain sequential awaits in that case; atomicity then
 * comes from the caller's own transaction, same guarantee either way. */
export async function redeemVoucherRecord(
  voucherId: string,
  userId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  const voucher = await client.voucher.findUniqueOrThrow({ where: { id: voucherId } });

  if (voucher.status !== "ACTIVE") {
    throw new Error("That voucher has already been redeemed or is no longer active.");
  }
  if (voucher.expiresAt && voucher.expiresAt < new Date()) {
    await client.voucher.update({ where: { id: voucher.id }, data: { status: "EXPIRED" } });
    throw new Error("That voucher has expired.");
  }

  const redeem = () => client.voucherRedemption.create({ data: { voucherId: voucher.id, userId } });
  const markRedeemed = () =>
    client.voucher.update({ where: { id: voucher.id }, data: { status: "REDEEMED" } });
  const grantSubscription = () =>
    client.subscription.create({
      data: {
        userId,
        plan: voucher.plan,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

  if (client === prisma) {
    await prisma.$transaction([redeem(), markRedeemed(), grantSubscription()]);
  } else {
    await redeem();
    await markRedeemed();
    await grantSubscription();
  }
}
