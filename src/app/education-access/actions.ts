"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hashIp } from "@/lib/partners/attribution";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { getPlatformSettings } from "@/lib/legal/settings";

const orgTypes = [
  "INDIVIDUAL",
  "CORPORATION",
  "FOUNDATION",
  "NGO",
  "SCHOOL",
  "DIASPORA_ORGANIZATION",
  "ALUMNI_ASSOCIATION",
  "GOVERNMENT",
  "OTHER",
] as const;

const interests = [
  "SPONSOR_STUDENT",
  "SPONSOR_SCHOOL",
  "SPONSOR_COMMUNITY",
  "AI_TUTOR_10K",
  "GIRLS_IN_STEM",
  "CORPORATE_CSR",
  "FOUNDATION_PARTNERSHIP",
  "OTHER",
] as const;

const packages = [
  "STUDENT_SPONSOR",
  "CLASSROOM_SPONSOR",
  "SCHOOL_PARTNER",
  "COMMUNITY_CHAMPION",
  "FLAGSHIP_AI_TUTOR",
  "CUSTOM",
] as const;

const inquirySchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(150),
  organization: z.string().trim().max(200).optional(),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(30).optional(),
  country: z.string().trim().max(100).optional(),
  organizationType: z.enum(orgTypes),
  sponsorshipInterest: z.enum(interests),
  packageInterest: z.enum(packages).optional().or(z.literal("").transform(() => undefined)),
  estimatedStudents: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(5000),
});

export type EducationAccessResult = { error: string | null; success: boolean };

// Same rate-limit shape as src/app/contact/actions.ts's submitContactForm.
const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_SUBMISSIONS = 3;

export async function submitEducationAccessInquiry(
  _prevState: EducationAccessResult,
  formData: FormData
): Promise<EducationAccessResult> {
  const parsed = inquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please fill in all required fields.", success: false };
  }
  const data = parsed.data;

  const headerList = await headers();
  const ipHash = hashIp(headerList.get("x-forwarded-for"));

  if (ipHash) {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const recentCount = await prisma.educationAccessInquiry.count({
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

  const inquiry = await prisma.educationAccessInquiry.create({
    data: {
      fullName: data.fullName,
      organization: data.organization || undefined,
      email: data.email,
      phone: data.phone || undefined,
      country: data.country || undefined,
      organizationType: data.organizationType,
      sponsorshipInterest: data.sponsorshipInterest,
      packageInterest: data.packageInterest,
      estimatedStudents: data.estimatedStudents,
      message: data.message,
      userId: session?.user.id,
      ipHash: ipHash ?? undefined,
      status: "NEW",
    },
  });

  // Best-effort admin notification — never blocks or fails the
  // submission itself, whether Resend isn't configured or the send
  // itself errors (e.g. domain not yet verified).
  try {
    const settings = await getPlatformSettings();
    if (settings.supportEmail && isEmailConfigured()) {
      await sendEmail({
        to: settings.supportEmail,
        subject: "New Education Access Initiative inquiry",
        html: `
          <p>A new Education Access Initiative inquiry was submitted.</p>
          <p><strong>Name:</strong> ${data.fullName}</p>
          <p><strong>Organization:</strong> ${data.organization ?? "—"}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Sponsorship interest:</strong> ${data.sponsorshipInterest}</p>
          <p><a href="https://smartprepafrica.com/dashboard/admin/education-access">View in admin</a></p>
        `.trim(),
        idempotencyKey: `education-access-inquiry/${inquiry.id}`,
      });
    }
  } catch (error) {
    console.error("Failed to send Education Access admin notification:", error);
  }

  return { error: null, success: true };
}
