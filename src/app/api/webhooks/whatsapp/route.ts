import { prisma } from "@/lib/prisma";
import { getWhatsAppProvider, getDefaultWhatsAppProviderName } from "@/lib/whatsapp";
import { handleInboundMessage } from "@/lib/whatsapp/conversation-router";

/** Twilio's WhatsApp inbound webhook. Mirrors
 * src/app/api/webhooks/paystack/route.ts's structure: raw body first
 * (needed for signature verification), verify before parsing/acting,
 * always respond 200 (empty TwiML) so the provider doesn't retry-storm
 * on anything other than a bad signature. */
export async function POST(request: Request) {
  const rawBody = await request.text();

  const provider = getWhatsAppProvider(getDefaultWhatsAppProviderName());
  if (!provider.verifyWebhookSignature(rawBody, request.headers, request.url)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const from = params.get("From") ?? ""; // "whatsapp:+2348012345678"
  const body = params.get("Body") ?? "";
  const messageSid = params.get("MessageSid");
  const phoneNumber = from.replace(/^whatsapp:/, "");

  if (!phoneNumber) {
    return new Response("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const account = await prisma.whatsAppAccount.findUnique({ where: { phoneNumber } });

  await prisma.whatsAppMessageLog.create({
    data: {
      phoneNumber,
      direction: "INBOUND",
      whatsappAccountId: account?.id,
      providerMessageId: messageSid,
      status: "received",
    },
  });

  await handleInboundMessage(phoneNumber, body);

  return new Response("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
