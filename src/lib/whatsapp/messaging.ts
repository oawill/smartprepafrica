import { prisma } from "@/lib/prisma";
import { getWhatsAppProvider, getDefaultWhatsAppProviderName } from "@/lib/whatsapp";

/** The single choke point every outbound WhatsApp message goes
 * through — logs a WhatsAppMessageLog row regardless of provider
 * success/failure, so the admin metrics page (sent/failed counts)
 * stays accurate without extra bookkeeping at each call site. */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  body: string,
  whatsappAccountId?: string
): Promise<{ ok: boolean }> {
  const provider = getWhatsAppProvider(getDefaultWhatsAppProviderName());

  let result: { id: string; ok: boolean };
  try {
    result = await provider.sendMessage({ to: phoneNumber, body });
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    result = { id: "", ok: false };
  }

  await prisma.whatsAppMessageLog.create({
    data: {
      phoneNumber,
      direction: "OUTBOUND",
      whatsappAccountId,
      providerMessageId: result.id || null,
      status: result.ok ? "sent" : "failed",
    },
  });

  return { ok: result.ok };
}
