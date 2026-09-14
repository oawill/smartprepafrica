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
  preferredLocation: z.string().trim().max(200).optional(),
  preferredSchoolId: z.string().trim().min(1).optional().or(z.literal("").transform(() => undefined)),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(5000),
  consentGiven: z
    .string()
    .optional()
    .transform((v) => v === "on")
    .refine((v) => v, { message: "Please confirm you consent to being contacted." }),
});

export type EducationAccessResult = { error: string | null; success: boolean };

// Same rate-limit shape as src/app/contact/actions.ts's submitContactForm.
const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_SUBMISSIONS = 3;

async function checkRateLimit(ipHash: string | null): Promise<string | null> {
  if (!ipHash) return null;
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  const recentCount = await prisma.educationAccessInquiry.count({
    where: { ipHash, createdAt: { gte: windowStart } },
  });
  if (recentCount >= RATE_LIMIT_MAX_SUBMISSIONS) {
    return "You've sent several messages recently. Please wait a few minutes and try again.";
  }
  return null;
}

// Best-effort admin notification — never blocks or fails the submission
// itself, whether Resend isn't configured or the send itself errors (e.g.
// domain not yet verified).
async function notifyAdminOfInquiry(inquiryId: string, subject: string, extraLines: string): Promise<void> {
  try {
    const settings = await getPlatformSettings();
    if (settings.supportEmail && isEmailConfigured()) {
      await sendEmail({
        to: settings.supportEmail,
        subject,
        html: `
          <p>${subject}</p>
          ${extraLines}
          <p><a href="https://smartprepafrica.com/dashboard/admin/education-access">View in admin</a></p>
        `.trim(),
        idempotencyKey: `education-access-inquiry/${inquiryId}`,
      });
    }
  } catch (error) {
    console.error("Failed to send Education Access admin notification:", error);
  }
}

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

  const rateLimitError = await checkRateLimit(ipHash);
  if (rateLimitError) return { error: rateLimitError, success: false };

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
      preferredLocation: data.preferredLocation || undefined,
      preferredSchoolId: data.preferredSchoolId,
      consentGiven: data.consentGiven,
      message: data.message,
      userId: session?.user.id,
      ipHash: ipHash ?? undefined,
      status: "INQUIRY",
    },
  });

  await notifyAdminOfInquiry(
    inquiry.id,
    "New Education Access Initiative inquiry",
    `
      <p><strong>Name:</strong> ${data.fullName}</p>
      <p><strong>Organization:</strong> ${data.organization ?? "—"}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Sponsorship interest:</strong> ${data.sponsorshipInterest}</p>
    `
  );

  return { error: null, success: true };
}

const contactMethods = ["EMAIL", "PHONE", "EITHER"] as const;

const fundingInquirySchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(150),
  organization: z.string().trim().min(1, "Organization is required.").max(200),
  jobTitle: z.string().trim().max(150).optional(),
  organizationType: z.enum(orgTypes),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().max(30).optional(),
  country: z.string().trim().max(100).optional(),
  estimatedFundingRange: z.string().trim().max(50).optional(),
  preferredContactMethod: z.enum(contactMethods).optional(),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(5000),
  consentGiven: z
    .string()
    .optional()
    .transform((v) => v === "on")
    .refine((v) => v, { message: "Please confirm you consent to being contacted." }),
});

// Institutional funding contact form (Education Access phase 3) — writes
// to the same EducationAccessInquiry pipeline as the general sponsor
// enquiry form rather than a parallel model, just with its own
// funding-specific fields and a fixed FOUNDATION_PARTNERSHIP interest.
export async function submitFundingInquiry(
  _prevState: EducationAccessResult,
  formData: FormData
): Promise<EducationAccessResult> {
  const parsed = fundingInquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please fill in all required fields.", success: false };
  }
  const data = parsed.data;

  const headerList = await headers();
  const ipHash = hashIp(headerList.get("x-forwarded-for"));

  const rateLimitError = await checkRateLimit(ipHash);
  if (rateLimitError) return { error: rateLimitError, success: false };

  const session = await auth();

  const inquiry = await prisma.educationAccessInquiry.create({
    data: {
      fullName: data.fullName,
      organization: data.organization,
      jobTitle: data.jobTitle || undefined,
      email: data.email,
      phone: data.phone || undefined,
      country: data.country || undefined,
      organizationType: data.organizationType,
      sponsorshipInterest: "FOUNDATION_PARTNERSHIP",
      estimatedFundingRange: data.estimatedFundingRange || undefined,
      preferredContactMethod: data.preferredContactMethod,
      consentGiven: data.consentGiven,
      message: data.message,
      userId: session?.user.id,
      ipHash: ipHash ?? undefined,
      status: "INQUIRY",
    },
  });

  await notifyAdminOfInquiry(
    inquiry.id,
    "New institutional funding inquiry",
    `
      <p><strong>Name:</strong> ${data.fullName}</p>
      <p><strong>Organization:</strong> ${data.organization}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Estimated funding range:</strong> ${data.estimatedFundingRange ?? "—"}</p>
    `
  );

  return { error: null, success: true };
}
