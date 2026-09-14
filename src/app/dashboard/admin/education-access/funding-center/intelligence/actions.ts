"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import { computeTotalScore, ELIGIBILITY_REQUIREMENTS } from "@/lib/education-access/funding-center/scoring";

const sourceTypes = [
  "FOUNDATION_WEBSITE",
  "CORPORATE_CSR",
  "GOVERNMENT_PORTAL",
  "PHILANTHROPIC_NETWORK",
  "DEVELOPMENT_ORG",
  "GRANT_DATABASE",
  "MANUAL_URL",
  "APPROVED_API",
  "OTHER",
] as const;

function toOptionalDate(raw: FormDataEntryValue | null): Date | undefined {
  if (!raw || typeof raw !== "string" || !raw.trim()) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toOptionalInt(raw: FormDataEntryValue | null): number | undefined {
  if (!raw || typeof raw !== "string" || !raw.trim()) return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : Math.round(n);
}

// Manual entry only this pass (brief §19 — no URL fetching or AI
// extraction). sourceUrl is mandatory (brief §5) — enforced here, not
// just in the schema, since the create form itself has no other gate.
const discoverySchema = z.object({
  sourceName: z.string().trim().min(1, "Source organization is required."),
  sourceType: z.enum(sourceTypes),
  sourceUrl: z.string().trim().url("A valid source URL is required."),
  funderName: z.string().trim().min(1),
  opportunityName: z.string().trim().min(1),
  opportunityUrl: z.string().trim().optional(),
  description: z.string().trim().optional(),
  fundingFocus: z.string().trim().optional(),
  geographicFocus: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  eligibilitySummary: z.string().trim().optional(),
});

export type DiscoveryResult = { error: string | null; success: boolean };

export async function createDiscovery(_prevState: DiscoveryResult, formData: FormData): Promise<DiscoveryResult> {
  const session = await requireActionPermission("funding_center.manage");
  const parsed = discoverySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please fill in all required fields.", success: false };
  }
  const data = parsed.data;
  const fundingCategories = formData.getAll("fundingCategories").map(String);

  const discovery = await prisma.educationAccessGrantDiscovery.create({
    data: {
      sourceName: data.sourceName,
      sourceType: data.sourceType,
      sourceUrl: data.sourceUrl,
      funderName: data.funderName,
      opportunityName: data.opportunityName,
      opportunityUrl: data.opportunityUrl || undefined,
      description: data.description || undefined,
      fundingFocus: data.fundingFocus || undefined,
      fundingCategories,
      geographicFocus: data.geographicFocus || undefined,
      currency: data.currency || undefined,
      eligibilitySummary: data.eligibilitySummary || undefined,
      rollingDeadline: formData.get("rollingDeadline") === "on",
      deadline: toOptionalDate(formData.get("deadline")),
      minimumAwardMinor: toOptionalInt(formData.get("minimumAwardMinor")),
      maximumAwardMinor: toOptionalInt(formData.get("maximumAwardMinor")),
      lastCheckedAt: new Date(),
      verificationStatus: "UNVERIFIED",
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "DISCOVERY_CREATED",
    resourceType: "EducationAccessGrantDiscovery",
    resourceId: discovery.id,
    result: "SUCCESS",
    after: { opportunityName: discovery.opportunityName, sourceUrl: discovery.sourceUrl },
  });

  revalidatePath("/dashboard/admin/education-access/funding-center/intelligence");
  redirect(`/dashboard/admin/education-access/funding-center/intelligence/${discovery.id}`);
}

const verificationStatuses = ["UNVERIFIED", "AI_EXTRACTED", "NEEDS_REVIEW", "PARTIALLY_VERIFIED", "VERIFIED", "OUTDATED", "INVALID"] as const;

// The display-only Funder/Opportunity/Program Fit checklist keys (brief
// §6) — group-prefixed since they're descriptive, not read by
// computeEligibilityStatus. Kept in sync with the detail page's
// DISPLAY_ONLY_GROUPS.
const DISPLAY_ONLY_KEYS = [
  "Funder: Organization exists",
  "Funder: Official website confirmed",
  "Funder: Funding program confirmed",
  "Opportunity: Opportunity currently exists",
  "Opportunity: Application currently open or rolling",
  "Opportunity: Deadline confirmed",
  "Opportunity: Award range confirmed where available",
  "Program Fit: Education",
  "Program Fit: Digital learning",
  "Program Fit: AI in education",
  "Program Fit: Youth",
  "Program Fit: Africa",
  "Program Fit: Nigeria",
  "Program Fit: School access",
  "Program Fit: Exam preparation",
] as const;

export async function updateDiscoveryVerification(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const discoveryId = formData.get("discoveryId") as string;
  const verificationStatus = formData.get("verificationStatus") as (typeof verificationStatuses)[number];

  const checklist: Record<string, string> = {};
  for (const requirement of [...ELIGIBILITY_REQUIREMENTS, ...DISPLAY_ONLY_KEYS]) {
    const value = formData.get(requirement) as string | null;
    if (value === "CONFIRMED" || value === "NOT_CONFIRMED" || value === "NOT_APPLICABLE" || value === "DISQUALIFIED") {
      checklist[requirement] = value;
    }
  }

  const before = await prisma.educationAccessGrantDiscovery.findUnique({
    where: { id: discoveryId },
    select: { verificationStatus: true },
  });

  // Never allow "Verified" without a real source URL (brief §5) — the
  // sourceUrl column is NOT NULL already, but this guards the specific
  // rule explicitly rather than relying on that as an accident of schema.
  const discovery = await prisma.educationAccessGrantDiscovery.findUnique({ where: { id: discoveryId }, select: { sourceUrl: true } });
  const finalStatus = verificationStatus === "VERIFIED" && !discovery?.sourceUrl ? "NEEDS_REVIEW" : verificationStatus;

  await prisma.educationAccessGrantDiscovery.update({
    where: { id: discoveryId },
    data: {
      verificationStatus: finalStatus,
      verificationChecklist: checklist,
      lastCheckedAt: new Date(),
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "DISCOVERY_VERIFIED",
    resourceType: "EducationAccessGrantDiscovery",
    resourceId: discoveryId,
    result: "SUCCESS",
    before: before ?? undefined,
    after: { verificationStatus: finalStatus },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/intelligence/${discoveryId}`);
}

const scoreSchema = z.object({
  educationScore: z.coerce.number().int().min(0).max(20),
  nigeriaAfricaScore: z.coerce.number().int().min(0).max(20),
  educationAccessScore: z.coerce.number().int().min(0).max(15),
  digitalLearningScore: z.coerce.number().int().min(0).max(15),
  aiTechScore: z.coerce.number().int().min(0).max(10),
  youthScore: z.coerce.number().int().min(0).max(10),
  fundingPotentialScore: z.coerce.number().int().min(0).max(5),
  timingScore: z.coerce.number().int().min(0).max(5),
});

export async function updateDiscoveryScore(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const discoveryId = formData.get("discoveryId") as string;
  const parsed = scoreSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const scores = parsed.data;
  const totalScore = computeTotalScore(scores);

  await prisma.educationAccessGrantDiscovery.update({
    where: { id: discoveryId },
    data: { ...scores, totalScore },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "DISCOVERY_SCORE_CHANGED",
    resourceType: "EducationAccessGrantDiscovery",
    resourceId: discoveryId,
    result: "SUCCESS",
    after: { ...scores, totalScore },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/intelligence/${discoveryId}`);
}

const dismissalReasons = [
  "NOT_ELIGIBLE",
  "POOR_FIT",
  "DEADLINE_TOO_SOON",
  "FUNDING_TOO_SMALL",
  "FUNDING_RESTRICTIONS",
  "GEOGRAPHIC_MISMATCH",
  "PROGRAM_MISMATCH",
  "DUPLICATE",
  "EXPIRED",
  "NOT_CURRENTLY_PURSUING",
  "OTHER",
] as const;

export async function dismissDiscovery(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const discoveryId = formData.get("discoveryId") as string;
  const dismissedReason = formData.get("dismissedReason") as (typeof dismissalReasons)[number];

  await prisma.educationAccessGrantDiscovery.update({
    where: { id: discoveryId },
    data: { dismissedAt: new Date(), dismissedReason, dismissedById: session.user.id },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "DISCOVERY_DISMISSED",
    resourceType: "EducationAccessGrantDiscovery",
    resourceId: discoveryId,
    result: "SUCCESS",
    after: { dismissedReason },
  });

  revalidatePath("/dashboard/admin/education-access/funding-center/intelligence");
  revalidatePath(`/dashboard/admin/education-access/funding-center/intelligence/${discoveryId}`);
}

export async function watchNextCycle(formData: FormData) {
  await requireActionPermission("funding_center.manage");
  const discoveryId = formData.get("discoveryId") as string;

  await prisma.educationAccessGrantDiscovery.update({
    where: { id: discoveryId },
    data: { watchNextCycle: true },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/intelligence/${discoveryId}`);
}

export async function markDuplicate(formData: FormData) {
  await requireActionPermission("funding_center.manage");
  const discoveryId = formData.get("discoveryId") as string;
  const duplicateOfId = formData.get("duplicateOfId") as string;

  await prisma.educationAccessGrantDiscovery.update({
    where: { id: discoveryId },
    data: {
      duplicateStatus: duplicateOfId ? "DUPLICATE" : "NEW",
      duplicateOfId: duplicateOfId || null,
    },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/intelligence/${discoveryId}`);
}

// The one and only promotion path into the real pipeline — never
// automatic (brief §18: "Do not automatically move discoveries directly
// into active grant applications").
export async function addToPipeline(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const discoveryId = formData.get("discoveryId") as string;
  const funderId = formData.get("funderId") as string;
  if (!funderId) return;

  const discovery = await prisma.educationAccessGrantDiscovery.findUnique({ where: { id: discoveryId } });
  if (!discovery) return;

  const opportunity = await prisma.educationAccessFundingOpportunity.create({
    data: {
      funderId,
      opportunityName: discovery.opportunityName,
      description: discovery.description,
      opportunityUrl: discovery.opportunityUrl,
      geographicFocus: discovery.geographicFocus,
      fundingFocus: discovery.fundingFocus,
      minimumAwardMinor: discovery.minimumAwardMinor,
      maximumAwardMinor: discovery.maximumAwardMinor,
      currency: discovery.currency,
      deadline: discovery.deadline,
      rollingDeadline: discovery.rollingDeadline,
      eligibilityNotes: discovery.eligibilitySummary,
      sourceUrl: discovery.sourceUrl,
      sourceName: discovery.sourceName,
      retrievedDate: discovery.discoveredAt,
      lastVerifiedAt: discovery.lastCheckedAt,
      eligibilityChecklist: discovery.verificationChecklist ?? undefined,
      educationScore: discovery.educationScore,
      nigeriaAfricaScore: discovery.nigeriaAfricaScore,
      educationAccessScore: discovery.educationAccessScore,
      digitalLearningScore: discovery.digitalLearningScore,
      aiTechScore: discovery.aiTechScore,
      youthScore: discovery.youthScore,
      fundingPotentialScore: discovery.fundingPotentialScore,
      timingScore: discovery.timingScore,
      totalScore: discovery.totalScore,
      status: "RESEARCH",
    },
  });

  await prisma.educationAccessGrantDiscovery.update({
    where: { id: discoveryId },
    data: { importedOpportunityId: opportunity.id },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "DISCOVERY_IMPORTED",
    resourceType: "EducationAccessGrantDiscovery",
    resourceId: discoveryId,
    result: "SUCCESS",
    after: { importedOpportunityId: opportunity.id },
  });

  revalidatePath("/dashboard/admin/education-access/funding-center/intelligence");
  revalidatePath("/dashboard/admin/education-access/funding-center/opportunities");
  redirect(`/dashboard/admin/education-access/funding-center/opportunities/${opportunity.id}`);
}
