"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hashIp } from "@/lib/partners/attribution";

const accountTypes = ["STUDENT", "PARENT", "TEACHER", "SCHOOL", "SPONSOR", "PARTNER", "OTHER"] as const;
const topics = [
  "GENERAL_INQUIRY",
  "ACCOUNT_SUPPORT",
  "BILLING",
  "COURSE_SUPPORT",
  "SCHOOL_REGISTRATION",
  "PARTNER_PROGRAM",
  "AI_STUDY_COACH",
  "TECHNICAL_PROBLEM",
  "REPORT_ISSUE",
  "OTHER",
] as const;

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(30).optional(),
  accountType: z.enum(accountTypes),
  topic: z.enum(topics),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(5000),
  agree: z.literal("on", { message: "You must agree before sending your message." }),
});

export type ContactResult = { error: string | null; success: boolean };

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_SUBMISSIONS = 3;

export async function submitContactForm(
  _prevState: ContactResult,
  formData: FormData
): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please fill in all required fields.", success: false };
  }
  const data = parsed.data;

  const headerList = await headers();
  const ipHash = hashIp(headerList.get("x-forwarded-for"));

  if (ipHash) {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const recentCount = await prisma.contactSubmission.count({
      where: { ipHash, createdAt: { gte: windowStart } },
    });
    if (recentCount >= RATE_LIMIT_MAX_SUBMISSIONS) {
      return {
        error: "You've sent several messages recently. Please wait a few minutes and try again.",
        success: false,
      };
    }
  }

  const session = await auth();

  await prisma.contactSubmission.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || undefined,
      accountType: data.accountType,
      topic: data.topic,
      message: data.message,
      userId: session?.user.id,
      ipHash: ipHash ?? undefined,
      status: "NEW",
    },
  });

  return { error: null, success: true };
}
