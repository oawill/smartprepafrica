import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Deliberately random, not sequential like the admin reference numbers in
 * src/lib/admin/ids.ts — this code grants access to a student's academic
 * data once a parent submits it, so it must not be enumerable. */
function randomLinkCode(): string {
  let letters = "";
  for (let i = 0; i < 3; i++) letters += LETTERS[randomInt(LETTERS.length)];
  const digits = String(randomInt(100000)).padStart(5, "0");
  return `SPA-${letters}-${digits}`;
}

async function generateParentLinkCode(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = randomLinkCode();
    const exists = await prisma.studentProfile.findUnique({ where: { linkCode: candidate } });
    if (!exists) return candidate;
  }
  throw new Error("Could not generate a unique parent link code.");
}

/** Lazily generates and persists a student's link code on first access,
 * so existing students don't need a backfill migration. */
export async function getOrCreateLinkCode(studentProfileId: string): Promise<string> {
  const student = await prisma.studentProfile.findUniqueOrThrow({
    where: { id: studentProfileId },
    select: { linkCode: true },
  });
  if (student.linkCode) return student.linkCode;

  const linkCode = await generateParentLinkCode();
  const updated = await prisma.studentProfile.update({
    where: { id: studentProfileId },
    data: { linkCode },
    select: { linkCode: true },
  });
  return updated.linkCode!;
}
