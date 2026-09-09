import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Same shape as generateVoucherCode/generateJoinCode — random, not
 * sequential, since this code is used for lookup (see
 * src/app/certificates/verify/[code]/page.tsx) and a sequential one
 * would let anyone enumerate every issued certificate. */
export function generateCertificateVerificationCode(): string {
  return `CERT-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Returns a certificate's verificationCode, generating and persisting
 * one first if it doesn't have one yet — pre-Phase-5 certificates were
 * issued before this field existed. Same lazy-backfill-on-read
 * convention as User.studentNumber/School.schoolNumber
 * (src/lib/admin/ids.ts). Collision-retry loop matches
 * createUniqueVoucher's shape (dashboard/sponsor/actions.ts). */
export async function ensureCertificateVerificationCode(
  certificateId: string,
  existingCode: string | null
): Promise<string> {
  if (existingCode) return existingCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const updated = await prisma.certificate.update({
        where: { id: certificateId },
        data: { verificationCode: generateCertificateVerificationCode() },
      });
      return updated.verificationCode!;
    } catch {
      // Unique code collision (very unlikely) — retry with a fresh code.
    }
  }
  throw new Error("Could not generate a unique certificate verification code.");
}
