"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

const orgTypes = [
  "PRIVATE_FOUNDATION",
  "CORPORATE_FOUNDATION",
  "CORPORATE_CSR",
  "FAMILY_FOUNDATION",
  "COMMUNITY_FOUNDATION",
  "NGO",
  "DEVELOPMENT_ORGANIZATION",
  "MULTILATERAL_ORGANIZATION",
  "GOVERNMENT_PROGRAM",
  "PHILANTHROPIC_NETWORK",
  "OTHER",
] as const;

function toOptionalInt(raw: FormDataEntryValue | null): number | undefined {
  if (!raw || typeof raw !== "string" || !raw.trim()) return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : Math.round(n);
}

function toOptionalDate(raw: FormDataEntryValue | null): Date | undefined {
  if (!raw || typeof raw !== "string" || !raw.trim()) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const funderSchema = z.object({
  organizationName: z.string().trim().min(1),
  organizationType: z.enum(orgTypes),
  website: z.string().trim().optional(),
  country: z.string().trim().optional(),
  headquarters: z.string().trim().optional(),
  geographicFocus: z.string().trim().optional(),
  fundingFocus: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  applicationMethod: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  sourceUrl: z.string().trim().optional(),
});

export async function createFunder(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const parsed = funderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const data = parsed.data;

  const funder = await prisma.educationAccessFunder.create({
    data: {
      organizationName: data.organizationName,
      organizationType: data.organizationType,
      website: data.website || undefined,
      country: data.country || undefined,
      headquarters: data.headquarters || undefined,
      geographicFocus: data.geographicFocus || undefined,
      fundingFocus: data.fundingFocus || undefined,
      currency: data.currency || undefined,
      applicationMethod: data.applicationMethod || undefined,
      notes: data.notes || undefined,
      sourceUrl: data.sourceUrl || undefined,
      educationFocus: formData.get("educationFocus") === "on",
      technologyFocus: formData.get("technologyFocus") === "on",
      youthFocus: formData.get("youthFocus") === "on",
      africaFocus: formData.get("africaFocus") === "on",
      nigeriaFocus: formData.get("nigeriaFocus") === "on",
      acceptsUnsolicitedProposals: formData.get("acceptsUnsolicitedProposals") === "on",
      typicalMinGrantMinor: toOptionalInt(formData.get("typicalMinGrantMinor")),
      typicalMaxGrantMinor: toOptionalInt(formData.get("typicalMaxGrantMinor")),
      lastVerifiedAt: toOptionalDate(formData.get("lastVerifiedAt")),
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "FUNDER_CREATED",
    resourceType: "EducationAccessFunder",
    resourceId: funder.id,
    result: "SUCCESS",
    after: { organizationName: funder.organizationName },
  });

  revalidatePath("/dashboard/admin/education-access/funding-center/funders");
  redirect(`/dashboard/admin/education-access/funding-center/funders/${funder.id}`);
}

const relationshipStrengths = [
  "NO_RELATIONSHIP",
  "IDENTIFIED",
  "INTRODUCED",
  "INITIAL_CONTACT",
  "CONVERSATION_STARTED",
  "ACTIVE_RELATIONSHIP",
  "EXISTING_PARTNER",
] as const;

export async function createContact(formData: FormData) {
  await requireActionPermission("funding_center.manage");
  const funderId = formData.get("funderId") as string;
  const firstName = formData.get("firstName") as string;
  if (!firstName?.trim()) return;

  await prisma.educationAccessFunderContact.create({
    data: {
      funderId,
      firstName: firstName.trim(),
      lastName: (formData.get("lastName") as string) || undefined,
      title: (formData.get("title") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      linkedinUrl: (formData.get("linkedinUrl") as string) || undefined,
      relationshipStrength: (formData.get("relationshipStrength") as (typeof relationshipStrengths)[number]) || "NO_RELATIONSHIP",
      notes: (formData.get("notes") as string) || undefined,
    },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/funders/${funderId}`);
}

export async function updateContactRelationship(formData: FormData) {
  await requireActionPermission("funding_center.manage");
  const contactId = formData.get("contactId") as string;
  const funderId = formData.get("funderId") as string;
  const relationshipStrength = formData.get("relationshipStrength") as (typeof relationshipStrengths)[number];

  await prisma.educationAccessFunderContact.update({
    where: { id: contactId },
    data: { relationshipStrength },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/funders/${funderId}`);
}

// Phase 5 — funder-level eligibility-barrier facts (brief §7) and
// intelligence-profile fields (brief §20). Every permits* flag defaults
// to unknown (null) unless explicitly researched — never assumed true.
export async function updateFunderIntelligence(formData: FormData) {
  await requireActionPermission("funding_center.manage");
  const funderId = formData.get("funderId") as string;

  await prisma.educationAccessFunder.update({
    where: { id: funderId },
    data: {
      overview: (formData.get("overview") as string) || null,
      knownPrograms: (formData.get("knownPrograms") as string) || null,
      researchNotes: (formData.get("researchNotes") as string) || null,
      permitsFiscalSponsorship: formData.get("permitsFiscalSponsorship") === "on",
      permitsInternationalOrgs: formData.get("permitsInternationalOrgs") === "on",
      permitsForProfitSocialEnterprise: formData.get("permitsForProfitSocialEnterprise") === "on",
      permitsCorporatePartnership: formData.get("permitsCorporatePartnership") === "on",
      permitsProgramRelatedInvestment: formData.get("permitsProgramRelatedInvestment") === "on",
      permitsDirectInternationalGrants: formData.get("permitsDirectInternationalGrants") === "on",
    },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/funders/${funderId}`);
}

const watchlistReasons = [
  "Strong Strategic Fit",
  "No Current Opportunity",
  "Relationship Development",
  "Future Funding Cycle",
  "Invitation Only",
  "CSR Prospect",
  "Potential Strategic Partner",
] as const;

export async function updateWatchlist(formData: FormData) {
  await requireActionPermission("funding_center.manage");
  const funderId = formData.get("funderId") as string;
  const watchlisted = formData.get("watchlisted") === "on";

  await prisma.educationAccessFunder.update({
    where: { id: funderId },
    data: {
      watchlisted,
      watchlistReason: watchlisted ? (formData.get("watchlistReason") as (typeof watchlistReasons)[number]) : null,
      watchlistNotes: watchlisted ? (formData.get("watchlistNotes") as string) || null : null,
    },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/funders/${funderId}`);
}
