export type VerifyTransactionResult = {
  // Normalized here, not left as each provider's raw status string
  // (Paystack: "success", Flutterwave: "successful") — callers check
  // one boolean instead of a provider-specific string, closing exactly
  // the kind of leak this interface exists to prevent.
  successful: boolean;
  reference: string;
  amount: number; // minor currency unit (kobo/pesewas/cents), always
  metadata: Record<string, unknown> | null;
};

export interface PaymentProvider {
  readonly name: string;

  initializeTransaction(opts: {
    email: string;
    amountMinor: number;
    currency: string;
    reference: string;
    callbackUrl: string;
    metadata: Record<string, unknown>;
  }): Promise<string>; // returns the checkout/authorization URL

  verifyTransaction(reference: string): Promise<VerifyTransactionResult>;

  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
}
