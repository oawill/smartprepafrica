import type { WhatsAppProvider } from "@/lib/whatsapp/provider";
import { TwilioProvider } from "@/lib/whatsapp/twilio-provider";

const providers: Record<string, WhatsAppProvider> = {
  twilio: new TwilioProvider(),
  // meta: new MetaCloudProvider(), — added when the Meta Cloud API
  // integration is built; nothing else in this codebase needs to
  // change to support it, per the provider-abstraction goal.
};

export function getWhatsAppProvider(name: string): WhatsAppProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown WhatsApp provider: ${name}`);
  return provider;
}

export function getDefaultWhatsAppProviderName(): string {
  return "twilio";
}
