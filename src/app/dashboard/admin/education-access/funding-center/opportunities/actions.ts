"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import { computeTotalScore, ELIGIBILITY_REQUIREMENTS, type EligibilityChecklist } from "@/lib/education-access/funding-center/scoring";

const statuses = [
  "RESEARCH",
  "QUALIFIED",
  "PREPARING_LOI",
  "LOI_SUBMITTED",
  "INVITED_TO_APPLY",
  "PROPOSAL_DRAFTING",
  "SUBMITTED",
  "UNDER_REVIEW",
  "AWARDED",
  "DECLINED",
  "CLOSED",
] as const;

const priorities = ["HIGH", "MEDIUM", "LOW"] as const;
const programTags = ["GENERAL", "AI_TUTOR_10K"] as const;

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

const opportunitySchema = z.object({
  funderId: z.string().trim().min(1),
  opportunityName: z.string().trim().min(1),
  description: z.string().trim().optional(),
  opportunityUrl: z.string().trim().optional(),
  country: z.string().trim().optional(),
  geographicFocus: z.string().trim().optional(),
  fundingFocus: z.string().trim().optional(),
  eligibleCountries: z.string().trim().optional(),
  eligibleOrgTypes: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  applicationMethod: z.string().trim().optional(),
  eligibilityNotes: z.string().trim().optional(),
  programNotes: z.string().trim().optional(),
  status: z.enum(statuses),
  priority: z.enum(priorities),
  programTag: z.enum(programTags),
  sourceUrl: z.string().trim().optional(),
  sourceName: z.string().trim().optional(),
  nextAction: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function createOpportunity(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const parsed = opportunitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const data = parsed.data;

  const opportunity = await prisma.educationAccessFundingOpportunity.create({
    data: {
      funderId: data.funderId,
      opportunityName: data.opportunityName,
      description: data.description || undefined,
      opportunityUrl: data.opportunityUrl || undefined,
      country: data.country || undefined,
      geographicFocus: data.geographicFocus || undefined,
      fundingFocus: data.fundingFocus || undefined,
      eligibleCountries: data.eligibleCountries || undefined,
      eligibleOrgTypes: data.eligibleOrgTypes || undefined,
      currency: data.currency || undefined,
      applicationMethod: data.applicationMethod || undefined,
      eligibilityNotes: data.eligibilityNotes || undefined,
      programNotes: data.programNotes || undefined,
      status: data.status,
      priority: data.priority,
      programTag: data.programTag,
      sourceUrl: data.sourceUrl || undefined,
      sourceName: data.sourceName || undefined,
      nextAction: data.nextAction || undefined,
      notes: data.notes || undefined,
      rollingDeadline: formData.get("rollingDeadline") === "on",
      loiRequired: formData.get("loiRequired") === "on",
      matchFundingRequired: formData.get("matchFundingRequired") === "on",
      deadline: toOptionalDate(formData.get("deadline")),
      applicationOpenDate: toOptionalDate(formData.get("applicationOpenDate")),
      nextActionDate: toOptionalDate(formData.get("nextActionDate")),
      minimumAwardMinor: toOptionalInt(formData.get("minimumAwardMinor")),
      maximumAwardMinor: toOptionalInt(formData.get("maximumAwardMinor")),
      amountRequestedMinor: toOptionalInt(formData.get("amountRequestedMinor")),
      retrievedDate: toOptionalDate(formData.get("retrievedDate")),
      lastVerifiedAt: toOptionalDate(formData.get("lastVerifiedAt")),
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "OPPORTUNITY_CREATED",
    resourceType: "EducationAccessFundingOpportunity",
    resourceId: opportunity.id,
    result: "SUCCESS",
    after: { opportunityName: opportunity.opportunityName, status: opportunity.status },
  });

  revalidatePath("/dashboard/admin/education-access/funding-center/opportunities");
  redirect(`/dashboard/admin/education-access/funding-center/opportunities/${opportunity.id}`);
}

export async function updateOpportunityStatus(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const opportunityId = formData.get("opportunityId") as string;
  const status = formData.get("status") as (typeof statuses)[number];
  const priority = formData.get("priority") as (typeof priorities)[number];

  const before = await prisma.educationAccessFundingOpportunity.findUnique({
    where: { id: opportunityId },
    select: { status: true, priority: true },
  });

  await prisma.educationAccessFundingOpportunity.update({
    where: { id: opportunityId },
    data: { status, priority },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "OPPORTUNITY_STATUS_CHANGED",
    resourceType: "EducationAccessFundingOpportunity",
    resourceId: opportunityId,
    result: "SUCCESS",
    before: before ?? undefined,
    after: { status, priority },
  });

  revalidatePath("/dashboard/admin/education-access/funding-center/opportunities");
  revalidatePath(`/dashboard/admin/education-access/funding-center/opportunities/${opportunityId}`);
}

export async function markNotPursuing(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const opportunityId = formData.get("opportunityId") as string;

  await prisma.educationAccessFundingOpportunity.update({
    where: { id: opportunityId },
    data: { status: "CLOSED" },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "OPPORTUNITY_STATUS_CHANGED",
    resourceType: "EducationAccessFundingOpportunity",
    resourceId: opportunityId,
    result: "SUCCESS",
    after: { status: "CLOSED", reason: "Marked not pursuing" },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/opportunities/${opportunityId}`);
}

const scoreSchema = z.object({
  missionScore: z.coerce.number().int().min(0).max(25),
  geographicScore: z.coerce.number().int().min(0).max(20),
  programScore: z.coerce.number().int().min(0).max(20),
  eligibilityScore: z.coerce.number().int().min(0).max(20),
  fundingScore: z.coerce.number().int().min(0).max(10),
  timingScore: z.coerce.number().int().min(0).max(5),
});

export async function updateOpportunityScores(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const opportunityId = formData.get("opportunityId") as string;
  const parsed = scoreSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const scores = parsed.data;
  const totalScore = computeTotalScore(scores);

  const before = await prisma.educationAccessFundingOpportunity.findUnique({
    where: { id: opportunityId },
    select: { totalScore: true },
  });

  await prisma.educationAccessFundingOpportunity.update({
    where: { id: opportunityId },
    data: { ...scores, totalScore },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "OPPORTUNITY_SCORE_CHANGED",
    resourceType: "EducationAccessFundingOpportunity",
    resourceId: opportunityId,
    result: "SUCCESS",
    before: before ?? undefined,
    after: { ...scores, totalScore },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/opportunities/${opportunityId}`);
}

export async function updateOpportunityEligibility(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const opportunityId = formData.get("opportunityId") as string;

  const checklist: EligibilityChecklist = {};
  for (const requirement of ELIGIBILITY_REQUIREMENTS) {
    const value = formData.get(requirement) as string | null;
    if (value === "CONFIRMED" || value === "NOT_CONFIRMED" || value === "NOT_APPLICABLE" || value === "DISQUALIFIED") {
      checklist[requirement] = value;
    }
  }

  const before = await prisma.educationAccessFundingOpportunity.findUnique({
    where: { id: opportunityId },
    select: { eligibilityChecklist: true },
  });

  await prisma.educationAccessFundingOpportunity.update({
    where: { id: opportunityId },
    data: { eligibilityChecklist: checklist },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "OPPORTUNITY_ELIGIBILITY_CHANGED",
    resourceType: "EducationAccessFundingOpportunity",
    resourceId: opportunityId,
    result: "SUCCESS",
    before: (before?.eligibilityChecklist as Record<string, unknown>) ?? undefined,
    after: checklist,
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/opportunities/${opportunityId}`);
}

export async function updateOpportunityDetails(formData: FormData) {
  await requireActionPermission("funding_center.manage");
  const opportunityId = formData.get("opportunityId") as string;

  await prisma.educationAccessFundingOpportunity.update({
    where: { id: opportunityId },
    data: {
      assignedToId: (formData.get("assignedToId") as string) || null,
      nextAction: (formData.get("nextAction") as string) || null,
      nextActionDate: toOptionalDate(formData.get("nextActionDate")) ?? null,
      amountRequestedMinor: toOptionalInt(formData.get("amountRequestedMinor")) ?? null,
      amountAwardedMinor: toOptionalInt(formData.get("amountAwardedMinor")) ?? null,
      lastVerifiedAt: toOptionalDate(formData.get("lastVerifiedAt")) ?? null,
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/opportunities/${formData.get("opportunityId")}`);
}

export async function saveSearch(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const name = formData.get("name") as string;
  const filters = formData.get("filters") as string;
  if (!name?.trim()) return;

  await prisma.educationAccessSavedSearch.create({
    data: {
      ownerId: session.user.id,
      name: name.trim(),
      filters: filters ? JSON.parse(filters) : {},
    },
  });

  revalidatePath("/dashboard/admin/education-access/funding-center/opportunities");
}
