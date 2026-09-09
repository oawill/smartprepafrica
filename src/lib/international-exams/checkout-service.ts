import { randomUUID } from "node:crypto";
import type { InternationalExamProduct } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider, getDefaultPaymentProviderName } from "@/lib/payments";
import { INTERNATIONAL_EXAM_PRICING_KOBO } from "@/lib/international-exams/pricing";

/** Creates a pending InternationalExamPurchase and starts a transaction
 * with the current default payment provider for it. Mirrors
 * initiateSubscriptionCheckout in src/lib/subscriptions/checkout.ts in
 * shape but writes to InternationalExamPurchase, never
 * Payment/Subscription — the existing subscription checkout path is
 * completely untouched. */
export async function initiateInternationalExamCheckout(opts: {
  userId: string;
  userEmail: string;
  product: InternationalExamProduct;
}): Promise<string> {
  const amountKobo = INTERNATIONAL_EXAM_PRICING_KOBO[opts.product];
  const reference = `iep_${randomUUID()}`;
  const providerName = getDefaultPaymentProviderName();

  await prisma.internationalExamPurchase.create({
    data: {
      userId: opts.userId,
      product: opts.product,
      amountKobo,
      currency: "NGN",
      provider: providerName,
      reference,
      status: "PENDING",
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

  try {
    return await getPaymentProvider(providerName).initializeTransaction({
      email: opts.userEmail,
      amountMinor: amountKobo,
      currency: "NGN",
      reference,
      callbackUrl: `${baseUrl}/api/payments/international-callback`,
      metadata: {
        userId: opts.userId,
        product: opts.product,
      },
    });
  } catch (err) {
    await prisma.internationalExamPurchase.update({
      where: { reference },
      data: { status: "FAILED" },
    });
    throw err;
  }
}

/** Verifies a transaction with its recorded payment provider and marks
 * the purchase it paid for as SUCCESS. Idempotent — safe to call from
 * both the browser callback route and the server-to-server webhook for
 * the same reference, same convention as activateSubscriptionForReference. */
export async function activateInternationalExamPurchaseForReference(reference: string) {
  const purchase = await prisma.internationalExamPurchase.findUnique({ where: { reference } });
  if (!purchase || purchase.status === "SUCCESS") {
    return purchase;
  }

  const result = await getPaymentProvider(purchase.provider).verifyTransaction(reference);

  if (!result.successful) {
    await prisma.internationalExamPurchase.update({
      where: { reference },
      data: { status: "FAILED" },
    });
    return null;
  }

  return prisma.internationalExamPurchase.update({
    where: { reference },
    data: { status: "SUCCESS", paidAt: new Date() },
  });
}
