import type { PaymentProvider, VerifyTransactionResult } from "@/lib/payments/provider";

const FLUTTERWAVE_BASE = "https://api.flutterwave.com/v3";

function requireSecretKey(): string {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Flutterwave is not configured yet. Set FLUTTERWAVE_SECRET_KEY in .env to enable this provider."
    );
  }
  return key;
}

/** Structurally-complete but unconfigured — no real Flutterwave account
 * exists yet (see docs/migration-plan.md Revised Phase 4), so every
 * method throws via requireSecretKey() until FLUTTERWAVE_SECRET_KEY is
 * set. Never reachable from today's checkout flows: getDefaultPaymentProviderName()
 * (src/lib/payments/index.ts) still resolves to "paystack" for every
 * new checkout. Field names/shapes follow Flutterwave's v3 Standard
 * API — double-check against current docs before ever going live. */
export class FlutterwaveProvider implements PaymentProvider {
  readonly name = "flutterwave";

  async initializeTransaction(opts: {
    email: string;
    amountMinor: number;
    currency: string;
    reference: string;
    callbackUrl: string;
    metadata: Record<string, unknown>;
  }): Promise<string> {
    const secretKey = requireSecretKey();

    const res = await fetch(`${FLUTTERWAVE_BASE}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: opts.reference,
        // Flutterwave amounts are major currency units (naira, not
        // kobo) — the one provider-specific conversion in this file;
        // Paystack and the rest of this codebase are minor-unit
        // throughout, so this divide-by-100 must stay local to here.
        amount: opts.amountMinor / 100,
        currency: opts.currency,
        redirect_url: opts.callbackUrl,
        customer: { email: opts.email },
        meta: opts.metadata,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.status !== "success") {
      throw new Error(data.message ?? "Failed to initialize payment.");
    }

    return data.data.link as string;
  }

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    const secretKey = requireSecretKey();

    const res = await fetch(
      `${FLUTTERWAVE_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );

    const data = await res.json();
    if (!res.ok || data.status !== "success") {
      throw new Error(data.message ?? "Failed to verify payment.");
    }

    return {
      successful: data.data.status === "successful",
      reference: data.data.tx_ref,
      amount: Math.round(data.data.amount * 100), // back to minor units
      metadata: data.data.meta ?? null,
    };
  }

  verifyWebhookSignature(_rawBody: string, headers: Headers): boolean {
    // Flutterwave's scheme is a static shared secret compared against
    // the "verif-hash" header — not an HMAC over the body like
    // Paystack, so rawBody is unused here (kept for interface parity).
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
    const signature = headers.get("verif-hash");
    return !!secretHash && !!signature && signature === secretHash;
  }
}
