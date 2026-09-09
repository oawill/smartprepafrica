import { randomBytes, randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Mirrors generateVoucherCode's pattern (dashboard/sponsor/actions.ts) —
 * uppercase hex avoids ambiguous characters (0/O, 1/I/l) without needing
 * a custom alphabet. */
export function generateJoinCode(): string {
  return `SJ-${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** 4-digit numeric PIN, zero-padded (e.g. "0042") — short enough for a
 * school to read aloud or print, distinct from the code (which
 * identifies the school; the PIN is what actually gates access). */
export function generateJoinPin(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

/** Resolves a School by its standing join code+PIN, re-validating both
 * at registration time rather than trusting client state — same
 * convention as registerStaffFromInvitation's invitationToken re-check
 * (src/lib/school-invitations.ts). Throws a single generic message
 * regardless of whether the code or the PIN was wrong, so neither half
 * becomes an enumeration oracle. */
export async function resolveSchoolByJoinCode(
  client: Prisma.TransactionClient | typeof prisma,
  joinCode: string,
  joinPin: string
) {
  const school = await client.school.findUnique({ where: { joinCode } });
  if (!school || !school.joinPin || school.joinPin !== joinPin) {
    throw new Error("Invalid school code or PIN.");
  }
  return school;
}
