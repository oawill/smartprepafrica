"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma, SubscriptionPlan } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function assertSponsor(userId: string) {
  const sponsor = await prisma.sponsorProfile.findUnique({ where: { userId } });
  if (!sponsor) {
    throw new Error("You don't have a sponsor profile.");
  }
  return sponsor;
}

function generateVoucherCode(): string {
  return `SP-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function createUniqueVoucher(
  data: Omit<Prisma.VoucherUncheckedCreateInput, "code">
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.voucher.create({ data: { ...data, code: generateVoucherCode() } });
    } catch {
      // Unique code collision (very unlikely) — retry with a fresh code.
    }
  }
  throw new Error("Could not generate a unique voucher code. Please try again.");
}

export async function issueVoucher(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const sponsor = await assertSponsor(session.user.id);

  const plan = formData.get("plan") as SubscriptionPlan;
  const expiryDaysRaw = formData.get("expiryDays") as string;
  const expiryDays = expiryDaysRaw ? Number(expiryDaysRaw) : null;

  await createUniqueVoucher({
    sponsorId: sponsor.id,
    issuedById: session.user.id,
    plan,
    expiresAt: expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null,
  });

  revalidatePath("/dashboard/sponsor");
}

export async function createSponsorshipProgram(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const sponsor = await assertSponsor(session.user.id);

  const name = (formData.get("name") as string)?.trim();
  const plan = formData.get("plan") as SubscriptionPlan;
  const schoolId = (formData.get("schoolId") as string) || null;
  const subjectId = (formData.get("subjectId") as string) || null;
  const totalSeats = Number(formData.get("totalSeats"));
  const durationDays = Number(formData.get("durationDays"));

  if (!name || !totalSeats || totalSeats < 1 || !durationDays || durationDays < 1) {
    throw new Error("Fill in a program name, at least 1 seat, and a duration.");
  }

  const program = await prisma.sponsorshipProgram.create({
    data: { sponsorId: sponsor.id, name, plan, schoolId, subjectId, totalSeats, durationDays },
  });

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  for (let i = 0; i < totalSeats; i++) {
    await createUniqueVoucher({
      sponsorId: sponsor.id,
      issuedById: session.user.id,
      programId: program.id,
      plan,
      expiresAt,
    });
  }

  revalidatePath("/dashboard/sponsor");
}

export async function renewProgram(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");
  const sponsor = await assertSponsor(session.user.id);

  const programId = formData.get("programId") as string;
  const additionalSeats = Number(formData.get("additionalSeats"));
  if (!additionalSeats || additionalSeats < 1) {
    throw new Error("Enter how many additional seats to add.");
  }

  const program = await prisma.sponsorshipProgram.findUnique({ where: { id: programId } });
  if (!program || program.sponsorId !== sponsor.id) {
    throw new Error("Program not found.");
  }

  const expiresAt = new Date(Date.now() + program.durationDays * 24 * 60 * 60 * 1000);
  for (let i = 0; i < additionalSeats; i++) {
    await createUniqueVoucher({
      sponsorId: sponsor.id,
      issuedById: session.user.id,
      programId: program.id,
      plan: program.plan,
      expiresAt,
    });
  }

  await prisma.sponsorshipProgram.update({
    where: { id: programId },
    data: { totalSeats: { increment: additionalSeats } },
  });

  revalidatePath("/dashboard/sponsor");
}
