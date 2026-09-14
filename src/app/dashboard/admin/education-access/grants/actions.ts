"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";

const statuses = [
  "PROSPECT",
  "RESEARCHING",
  "QUALIFIED",
  "NOT_QUALIFIED",
  "PREPARING",
  "SUBMITTED",
  "UNDER_REVIEW",
  "AWARDED",
  "DECLINED",
  "ACTIVE",
  "REPORTING",
  "COMPLETED",
  "CLOSED",
] as const;

const priorities = ["HIGH", "MEDIUM", "LOW"] as const;

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

const grantSchema = z.object({
  funderName: z.string().trim().min(1),
  programName: z.string().trim().optional(),
  grantType: z.string().trim().optional(),
  country: z.string().trim().optional(),
  website: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  fundingArea: z.string().trim().optional(),
  geographicFocus: z.string().trim().optional(),
  typicalGrantSize: z.string().trim().optional(),
  eligibility: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  status: z.enum(statuses),
  priority: z.enum(priorities),
  reportingFrequency: z.string().trim().optional(),
  nextAction: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function createGrant(formData: FormData) {
  await requireActionPermission("education_access.grants_manage");
  const parsed = grantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const data = parsed.data;

  await prisma.educationAccessGrant.create({
    data: {
      funderName: data.funderName,
      programName: data.programName || undefined,
      grantType: data.grantType || undefined,
      country: data.country || undefined,
      website: data.website || undefined,
      contactName: data.contactName || undefined,
      contactEmail: data.contactEmail,
      fundingArea: data.fundingArea || undefined,
      geographicFocus: data.geographicFocus || undefined,
      typicalGrantSize: data.typicalGrantSize || undefined,
      eligibility: data.eligibility || undefined,
      currency: data.currency || undefined,
      status: data.status,
      priority: data.priority,
      reportingFrequency: data.reportingFrequency || undefined,
      nextAction: data.nextAction || undefined,
      notes: data.notes || undefined,
      deadline: toOptionalDate(formData.get("deadline")),
      amountRequestedMinor: toOptionalInt(formData.get("amountRequestedMinor")),
      amountAwardedMinor: toOptionalInt(formData.get("amountAwardedMinor")),
      applicationDate: toOptionalDate(formData.get("applicationDate")),
      decisionDate: toOptionalDate(formData.get("decisionDate")),
      startDate: toOptionalDate(formData.get("startDate")),
      endDate: toOptionalDate(formData.get("endDate")),
      nextReportDue: toOptionalDate(formData.get("nextReportDue")),
    },
  });

  revalidatePath("/dashboard/admin/education-access/grants");
}

export async function updateGrantStatus(formData: FormData) {
  await requireActionPermission("education_access.grants_manage");
  const grantId = formData.get("grantId") as string;
  const status = formData.get("status") as (typeof statuses)[number];
  const priority = formData.get("priority") as (typeof priorities)[number];

  await prisma.educationAccessGrant.update({
    where: { id: grantId },
    data: { status, priority },
  });

  revalidatePath("/dashboard/admin/education-access/grants");
}

export async function assignGrantOwner(formData: FormData) {
  const session = await requireActionPermission("education_access.grants_manage");
  const grantId = formData.get("grantId") as string;
  const assignToSelf = formData.get("assignToSelf") === "on";

  await prisma.educationAccessGrant.update({
    where: { id: grantId },
    data: { internalOwnerId: assignToSelf ? session.user.id : null },
  });

  revalidatePath("/dashboard/admin/education-access/grants");
}
