import type { SmsProvider } from "@/lib/sms/provider";
import { ConsoleSmsProvider } from "@/lib/sms/console-provider";

export type { SmsProvider };

/** The one seam a future phase swaps for a real provider — every caller
 * goes through this function rather than instantiating a provider
 * directly. */
export function getSmsProvider(): SmsProvider {
  return new ConsoleSmsProvider();
}
