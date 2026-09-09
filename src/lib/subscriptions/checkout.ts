import { randomUUID } from "node:crypto";
import type { SubscriptionPlan, BillingInterval } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvePlanPrice } from "@/lib/plans";
import { handlePartnerCommissionsForPayment } from "@/lib/partners/payment-hooks";
import { reverseCommissionsForPayment } from "@/lib/partners/compensation";
import { getPaymentProvider, getDefaultPaymentProviderName } from "@/lib/payments";

/**
 * Verifies a transaction with its recorded payment provider and
 * activates the subscription it paid for. Idempotent — safe to call
 * from both the browser callback route and the server-to-server
 * webhook for the same reference.
 */
export async function activateSubscriptionForReference(reference: string) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment || payment.status === "SUCCESS") {
    return payment;
  }

  const result = await getPaymentProvider(payment.provider).verifyTransaction(reference);

  if (!result.successful) {
    await prisma.payment.update({
      where: { reference },
      data: { status: "FAILED" },
    });
    return null;
  }

  const plan: SubscriptionPlan =
    (result.metadata?.plan as SubscriptionPlan | undefined) ?? "BASIC";
  const beneficiaryUserId =
    (result.metadata?.beneficiaryUserId as string | undefined) ?? payment.userId;
  // Old in-flight transactions initialized before `interval` existed have no
  // such metadata key — default to MONTHLY, matching their original behavior.
  const interval: BillingInterval =
    (result.metadata?.interval as BillingInterval | undefined) ?? "MONTHLY";
  const durationMs =
    interval === "ANNUAL" ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

  const subscription = await prisma.subscription.create({
    data: {
      userId: beneficiaryUserId,
      purchasedByUserId: payment.userId,
      plan,
      interval,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + durationMs),
    },
  });

  await prisma.payment.update({
    where: { reference },
    data: { status: "SUCCESS", subscriptionId: subscription.id, interval },
  });

  await handlePartnerCommissionsForPayment({
    paymentId: payment.id,
    subscriptionId: subscription.id,
    beneficiaryUserId,
    amountKobo: payment.amountKobo,
  });

  return subscription;
}

/**
 * Handles a refund or chargeback on a previously successful payment:
 * cancels the subscription it granted and reverses any partner
 * commissions attached to it (or flags them for manual clawback if a
 * commission was already paid out).
 */
export async function reversePaymentForReference(reference: string, reason: string) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment || payment.status !== "SUCCESS") return;

  if (payment.subscriptionId) {
    await prisma.subscription.update({
      where: { id: payment.subscriptionId },
      data: { status: "CANCELLED" },
    });
  }

  await prisma.payment.update({ where: { reference }, data: { status: "FAILED" } });
  await reverseCommissionsForPayment(payment.id, reason);
}

/**
 * Creates a pending Payment and starts a transaction with the current
 * default payment provider for a subscription plan. If
 * `beneficiaryUserId` is set, the resulting subscription grants access
 * to that user rather than the payer (e.g. a parent subscribing their
 * child). Throws on failure — the pending Payment is marked FAILED
 * before the error propagates, so callers only need to decide how to
 * redirect.
 */
export async function initiateSubscriptionCheckout(opts: {
  payerId: string;
  payerEmail: string;
  plan: SubscriptionPlan;
  interval?: BillingInterval;
  beneficiaryUserId?: string;
}): Promise<string> {
  const interval: BillingInterval = opts.interval ?? "MONTHLY";
  const payer = await prisma.user.findUnique({
    where: { id: opts.payerId },
    select: { countryId: true },
  });
  const price = await resolvePlanPrice(opts.plan, payer?.countryId, interval);
  if (!price) {
    throw new Error("That plan isn't available for direct checkout.");
  }

  const reference = `sp_${randomUUID()}`;
  const providerName = getDefaultPaymentProviderName();

  await prisma.payment.create({
    data: {
      userId: opts.payerId,
      amountKobo: price.amountMinor,
      currency: price.currency,
      interval,
      provider: providerName,
      reference,
      status: "PENDING",
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

  try {
    return await getPaymentProvider(providerName).initializeTransaction({
      email: opts.payerEmail,
      amountMinor: price.amountMinor,
      currency: price.currency,
      reference,
      callbackUrl: `${baseUrl}/api/payments/callback`,
      metadata: {
        userId: opts.payerId,
        plan: opts.plan,
        interval,
        ...(opts.beneficiaryUserId
          ? { beneficiaryUserId: opts.beneficiaryUserId }
          : {}),
      },
    });
  } catch (err) {
    await prisma.payment.update({
      where: { reference },
      data: { status: "FAILED" },
    });
    throw err;
  }
}
