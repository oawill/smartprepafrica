"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeLinkToken } from "@/lib/whatsapp/linking";
import { sendWhatsAppMessage } from "@/lib/whatsapp/messaging";
import { MAIN_MENU_TEXT } from "@/lib/whatsapp/menu";

export async function confirmLinkWhatsApp(token: string) {
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/link-whatsapp?token=${token}`)}`);

  let result: Awaited<ReturnType<typeof consumeLinkToken>>;
  try {
    result = await consumeLinkToken(token, session.user.id);
  } catch {
    // Most likely cause: this WhatsApp number is already linked to a
    // different SmartPrepAfrica account (phoneNumber is unique).
    redirect("/link-whatsapp/error?reason=already-linked");
  }

  if (result === "INVALID_OR_EXPIRED") {
    redirect("/link-whatsapp/error?reason=expired");
  }

  const account = await prisma.whatsAppAccount.findUnique({ where: { userId: session.user.id } });
  if (account) {
    await sendWhatsAppMessage(
      account.phoneNumber,
      `✅ Your WhatsApp number is now linked to your SmartPrepAfrica account.\n\n${MAIN_MENU_TEXT}`,
      account.id
    );
  }

  redirect("/link-whatsapp/success");
}
