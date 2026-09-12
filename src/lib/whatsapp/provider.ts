export type SendWhatsAppMessageResult = { id: string; ok: boolean };

export interface WhatsAppProvider {
  readonly name: string;
  sendMessage(opts: { to: string; body: string }): Promise<SendWhatsAppMessageResult>;
  /** Verifies an inbound webhook actually came from this provider.
   * Signature shape matches PaymentProvider.verifyWebhookSignature
   * (src/lib/payments/provider.ts) so the webhook route can follow
   * the same structure as api/webhooks/paystack/route.ts. */
  verifyWebhookSignature(rawBody: string, headers: Headers, url: string): boolean;
}
