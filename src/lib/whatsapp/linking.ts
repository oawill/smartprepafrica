import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const LINK_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Random, not sequential — same reasoning as every other lookup code
 * in this codebase (join codes, voucher codes, certificate verification
 * codes): a sequential token would let someone enumerate live tokens. */
function generateLinkToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Invalidates (by simply leaving old ones to expire — they're already
 * single-use via consumedAt) and creates a fresh link token for this
 * WhatsApp number. Returns the raw token to embed in the link sent to
 * the student. */
export async function createLinkToken(phoneNumber: string): Promise<string> {
  const token = generateLinkToken();
  await prisma.whatsAppLinkToken.create({
    data: { token, phoneNumber, expiresAt: new Date(Date.now() + LINK_TOKEN_TTL_MS) },
  });
  return token;
}

export type ConsumeLinkTokenResult = "LINKED" | "INVALID_OR_EXPIRED";

/** Called once an ALREADY-AUTHENTICATED user (they logged in normally on
 * the real website — this function never itself proves identity) confirms
 * linking. Upserts the WhatsAppAccount for that user/phone and marks the
 * token consumed so it can't be replayed. */
export async function consumeLinkToken(
  token: string,
  userId: string
): Promise<ConsumeLinkTokenResult> {
  const linkToken = await prisma.whatsAppLinkToken.findUnique({ where: { token } });
  if (!linkToken || linkToken.consumedAt || linkToken.expiresAt < new Date()) {
    return "INVALID_OR_EXPIRED";
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.whatsAppLinkToken.update({
      where: { token },
      data: { consumedAt: now, userId },
    }),
    prisma.whatsAppAccount.upsert({
      where: { userId },
      update: {
        phoneNumber: linkToken.phoneNumber,
        whatsappEnabled: true,
        verifiedAt: now,
        optInAt: now,
        optOutAt: null,
      },
      create: {
        userId,
        phoneNumber: linkToken.phoneNumber,
        verifiedAt: now,
        optInAt: now,
      },
    }),
  ]);

  return "LINKED";
}

export async function findAccountByPhone(phoneNumber: string) {
  return prisma.whatsAppAccount.findUnique({ where: { phoneNumber } });
}

export async function getLinkTokenPhoneNumber(token: string): Promise<string | null> {
  const linkToken = await prisma.whatsAppLinkToken.findUnique({ where: { token } });
  if (!linkToken || linkToken.consumedAt || linkToken.expiresAt < new Date()) return null;
  return linkToken.phoneNumber;
}
