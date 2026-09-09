import crypto from "node:crypto";
import type { PaymentProvider, VerifyTransactionResult } from "@/lib/payments/provider";

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

export class PaystackProvider implements PaymentProvider {
  readonly name = "paystack";

  async initializeTransaction(opts: {
    email: string;
    amountMinor: number;
    currency: string;
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
        amount: opts.amountMinor,
        currency: opts.currency,
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

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
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
      successful: data.data.status === "success",
      reference: data.data.reference,
      amount: data.data.amount,
      metadata: data.data.metadata ?? null,
    };
  }

  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = headers.get("x-paystack-signature");
    if (!secret || !signature) return false;

    const expectedSignature = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    return expectedSignature === signature;
  }
}
