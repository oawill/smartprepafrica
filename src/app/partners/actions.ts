"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getPartnerSettings } from "@/lib/partners/settings";
import { generatePartnerNumber, referralCodeFromPartnerNumber } from "@/lib/partners/ids";
import { logPartnerAudit } from "@/lib/partners/audit";
import { recordAcceptance } from "@/lib/legal/documents";
import { hashIp } from "@/lib/partners/attribution";

const partnerTypes = [
  "INDIVIDUAL_AFFILIATE",
  "TEACHER",
  "EDUCATION_CONSULTANT",
  "SCHOOL_REPRESENTATIVE",
  "INFLUENCER",
  "COMMUNITY_AMBASSADOR",
  "CORPORATE_NGO",
  "MARKETING_AGENCY",
  "OTHER",
] as const;

const applySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(5),
  country: z.string().min(1),
  state: z.string().optional(),
  city: z.string().optional(),
  organization: z.string().optional(),
  partnerType: z.enum(partnerTypes),
  preferredPaymentMethod: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  promotionPlan: z.string().optional(),
  referralSource: z.string().optional(),
  agreeToTerms: z.literal("on", {
    message: "You must agree to the Terms & Conditions and Privacy Policy.",
  }),
  termsAccepted: z.literal("on", {
    message: "You must agree to the SmartPrepAfrica.com Partner Program Terms.",
  }),
});

export type ApplyResult = { error: string | null };

export async function applyAsPartner(
  _prevState: ApplyResult,
  formData: FormData
): Promise<ApplyResult> {
  const parsed = applySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please fill in all required fields." };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const settings = await getPartnerSettings();
  const passwordHash = await bcrypt.hash(data.password, 10);
  const headerList = await headers();
  const ipHash = hashIp(headerList.get("x-forwarded-for"));

  const partner = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        passwordHash,
        role: "PARTNER",
      },
    });

    const autoApprove = !settings.requireAdminApproval;
    let partnerNumber: string | null = null;
    let referralCode: string | null = null;
    if (autoApprove) {
      partnerNumber = await generatePartnerNumber();
      referralCode = referralCodeFromPartnerNumber(partnerNumber);
    }

    const partner = await tx.partner.create({
      data: {
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        country: data.country,
        state: data.state || undefined,
        city: data.city || undefined,
        organization: data.organization || undefined,
        partnerType: data.partnerType,
        preferredPaymentMethod: data.preferredPaymentMethod || undefined,
        bankName: data.bankName || undefined,
        bankAccountName: data.bankAccountName || undefined,
        bankAccountNumber: data.bankAccountNumber || undefined,
        promotionPlan: data.promotionPlan || undefined,
        referralSource: data.referralSource || undefined,
        termsAcceptedAt: new Date(),
        status: autoApprove ? "APPROVED" : "PENDING",
        approvedAt: autoApprove ? new Date() : undefined,
        partnerNumber,
        referralCode,
      },
    });

    await recordAcceptance(tx, {
      type: "TERMS",
      userId: user.id,
      context: "PARTNER_APPLICATION",
      ipHash,
    });
    await recordAcceptance(tx, {
      type: "PRIVACY",
      userId: user.id,
      context: "PARTNER_APPLICATION",
      ipHash,
    });
    await recordAcceptance(tx, {
      type: "PARTNER_PROGRAM",
      userId: user.id,
      context: "PARTNER_APPLICATION",
      ipHash,
    });

    return partner;
  });

  await logPartnerAudit({
    actorUserId: partner.userId,
    action: "PARTNER_APPLIED",
    entityType: "Partner",
    entityId: partner.id,
    metadata: { autoApproved: partner.status === "APPROVED" },
  });

  redirect("/partners/apply/thank-you");
}
