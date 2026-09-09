import { randomBytes, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvePlanPrice } from "@/lib/plans";
import { getPaymentProvider, getDefaultPaymentProviderName } from "@/lib/payments";

function generateVoucherCode(): string {
  return `SL-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Same collision-retry shape as src/app/dashboard/sponsor/actions.ts's
 * createUniqueVoucher — duplicated rather than imported across the
 * sponsor/school boundary, matching this session's established
 * per-domain duplication precedent (e.g. src/lib/teachers/ids.ts). */
async function createUniqueVoucher(data: Omit<Prisma.VoucherUncheckedCreateInput, "code">) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.voucher.create({ data: { ...data, code: generateVoucherCode() } });
    } catch {
      // Unique code collision (very unlikely) — retry with a fresh code.
    }
  }
  throw new Error("Could not generate a unique voucher code. Please try again.");
}

/** Creates a purchase's seatCount Voucher rows. Split out from
 * activateSchoolLicensePurchaseForReference so the actual seat-issuance
 * logic is directly unit-testable without needing a live Paystack call —
 * same seam-extraction pattern as this session's resolveParticipant /
 * checkAndAwardBadges. */
export async function issueLicenseSeats(purchase: {
  id: string;
  purchasedById: string;
  plan: Prisma.SchoolLicensePurchaseGetPayload<object>["plan"];
  seatCount: number;
  durationDays: number;
}) {
  const expiresAt = new Date(Date.now() + purchase.durationDays * 24 * 60 * 60 * 1000);
  for (let i = 0; i < purchase.seatCount; i++) {
    await createUniqueVoucher({
      issuedById: purchase.purchasedById,
      schoolLicensePurchaseId: purchase.id,
      plan: purchase.plan,
      expiresAt,
    });
  }
}

/** Creates a pending SchoolLicensePurchase and starts a Paystack
 * transaction for it. Mirrors initiateSubscriptionCheckout in shape
 * (reuses the same low-level initializeTransaction call) but writes to
 * SchoolLicensePurchase, never Payment/Subscription directly — the
 * existing subscription checkout path is completely untouched. */
export async function initiateSchoolLicenseCheckout(opts: {
  payerId: string;
  payerEmail: string;
  schoolId: string;
  seatCount: number;
  durationDays: number;
}): Promise<string> {
  if (opts.seatCount < 1) throw new Error("Enter at least 1 seat.");
  if (opts.durationDays < 1) throw new Error("Enter a valid duration.");

  const payer = await prisma.user.findUnique({ where: { id: opts.payerId }, select: { countryId: true } });
  const perSeatPrice = await resolvePlanPrice("SCHOOL", payer?.countryId);
  if (!perSeatPrice) {
    throw new Error("School licences aren't available for checkout in your country yet.");
  }
  const amountKobo = perSeatPrice.amountMinor * opts.seatCount;

  const reference = `slp_${randomUUID()}`;
  const providerName = getDefaultPaymentProviderName();

  await prisma.schoolLicensePurchase.create({
    data: {
      schoolId: opts.schoolId,
      purchasedById: opts.payerId,
      plan: "SCHOOL",
      seatCount: opts.seatCount,
      durationDays: opts.durationDays,
      amountKobo,
      currency: perSeatPrice.currency,
      provider: providerName,
      reference,
      status: "PENDING",
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

  try {
    return await getPaymentProvider(providerName).initializeTransaction({
      email: opts.payerEmail,
      amountMinor: amountKobo,
      currency: perSeatPrice.currency,
      reference,
      callbackUrl: `${baseUrl}/api/payments/school-license-callback`,
      metadata: {
        schoolId: opts.schoolId,
        seatCount: opts.seatCount,
        durationDays: opts.durationDays,
      },
    });
  } catch (err) {
    await prisma.schoolLicensePurchase.update({ where: { reference }, data: { status: "FAILED" } });
    throw err;
  }
}

/** Verifies a transaction with Paystack and, on success, issues the
 * purchased seats as Voucher rows. Idempotent — safe to call from both
 * the browser callback route and the server-to-server webhook for the
 * same reference, same convention as activateSubscriptionForReference /
 * activateInternationalExamPurchaseForReference. Looks up its own table
 * by reference, so it can never collide with a personal-subscription
 * Payment row sharing the same webhook event. */
export async function activateSchoolLicensePurchaseForReference(reference: string) {
  const purchase = await prisma.schoolLicensePurchase.findUnique({ where: { reference } });
  if (!purchase || purchase.status === "SUCCESS") {
    return purchase;
  }

  const result = await getPaymentProvider(purchase.provider).verifyTransaction(reference);

  if (!result.successful) {
    await prisma.schoolLicensePurchase.update({ where: { reference }, data: { status: "FAILED" } });
    return null;
  }

  await issueLicenseSeats(purchase);

  return prisma.schoolLicensePurchase.update({
    where: { reference },
    data: { status: "SUCCESS", paidAt: new Date() },
  });
}
