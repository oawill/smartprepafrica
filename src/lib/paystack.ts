import { randomUUID } from "node:crypto";
import type { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLAN_PRICING_KOBO } from "@/lib/plans";
import { handlePartnerCommissionsForPayment } from "@/lib/partners/payment-hooks";
import { reverseCommissionsForPayment } from "@/lib/partners/compensation";

const PAYSTACK_BASE = "https://api.paystack.co";

function requireSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Payments are not configured yet. Set PAYSTACK_SECRET_KEY in .env to enable checkout."
    );
  }
  return key;
}

export async function initializeTransaction(opts: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<string> {
  const secretKey = requireSecretKey();

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: opts.email,
      amount: opts.amountKobo,
      reference: opts.reference,
      callback_url: opts.callbackUrl,
      metadata: opts.metadata,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Failed to initialize payment.");
  }

  return data.data.authorization_url as string;
}

type VerifyResult = {
  status: string;
  reference: string;
  amount: number;
  metadata: Record<string, unknown> | null;
};

export async function verifyTransaction(
  reference: string
): Promise<VerifyResult> {
  const secretKey = requireSecretKey();

  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message ?? "Failed to verify payment.");
  }

  return {
    status: data.data.status,
    reference: data.data.reference,
    amount: data.data.amount,
    metadata: data.data.metadata ?? null,
  };
}

/**
 * Verifies a transaction with Paystack and activates the subscription it
 * paid for. Idempotent — safe to call from both the browser callback route
 * and the server-to-server webhook for the same reference.
 */
export async function activateSubscriptionForReference(reference: string) {
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment || payment.status === "SUCCESS") {
    return payment;
  }

  const result = await verifyTransaction(reference);

  if (result.status !== "success") {
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

  const subscription = await prisma.subscription.create({
    data: {
      userId: beneficiaryUserId,
      purchasedByUserId: payment.userId,
      plan,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.payment.update({
    where: { reference },
    data: { status: "SUCCESS", subscriptionId: subscription.id },
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
 * Creates a pending Payment and starts a Paystack transaction for a
 * subscription plan. If `beneficiaryUserId` is set, the resulting
 * subscription grants access to that user rather than the payer (e.g. a
 * parent subscribing their child). Throws on failure — the pending Payment
 * is marked FAILED before the error propagates, so callers only need to
 * decide how to redirect.
 */
export async function initiateSubscriptionCheckout(opts: {
  payerId: string;
  payerEmail: string;
  plan: SubscriptionPlan;
  beneficiaryUserId?: string;
}): Promise<string> {
  const amountKobo = PLAN_PRICING_KOBO[opts.plan];
  if (!amountKobo) {
    throw new Error("That plan isn't available for direct checkout.");
  }

  const reference = `sp_${randomUUID()}`;

  await prisma.payment.create({
    data: {
      userId: opts.payerId,
      amountKobo,
      provider: "paystack",
      reference,
      status: "PENDING",
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

  try {
    return await initializeTransaction({
      email: opts.payerEmail,
      amountKobo,
      reference,
      callbackUrl: `${baseUrl}/api/payments/callback`,
      metadata: {
        userId: opts.payerId,
        plan: opts.plan,
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
