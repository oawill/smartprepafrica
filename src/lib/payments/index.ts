import type { PaymentProvider } from "@/lib/payments/provider";
import { PaystackProvider } from "@/lib/payments/paystack-provider";
import { FlutterwaveProvider } from "@/lib/payments/flutterwave-provider";

export type { PaymentProvider, VerifyTransactionResult } from "@/lib/payments/provider";

const providers: Record<string, PaymentProvider> = {
  paystack: new PaystackProvider(),
  flutterwave: new FlutterwaveProvider(),
};

export function getPaymentProvider(name: string): PaymentProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown payment provider: ${name}`);
  return provider;
}

/** The one place "which provider do NEW checkouts use" is decided —
 * every initiate*Checkout function reads this instead of hardcoding
 * "paystack", so switching the active default later is a one-line
 * change here, not a multi-file find-replace. */
export function getDefaultPaymentProviderName(): string {
  return "paystack";
}
