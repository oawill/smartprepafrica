"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

export async function startApplication(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const opportunityId = formData.get("opportunityId") as string;

  const application = await prisma.educationAccessApplication.create({
    data: { opportunityId },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "APPLICATION_STARTED",
    resourceType: "EducationAccessApplication",
    resourceId: application.id,
    result: "SUCCESS",
    after: { opportunityId },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/opportunities/${opportunityId}`);
  redirect(`/dashboard/admin/education-access/funding-center/applications/${application.id}`);
}

export async function updateApplication(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const applicationId = formData.get("applicationId") as string;
  const status = formData.get("status") as string;
  const submittedAtRaw = formData.get("submittedAt") as string;

  const before = await prisma.educationAccessApplication.findUnique({
    where: { id: applicationId },
    select: { status: true, opportunityId: true },
  });

  const application = await prisma.educationAccessApplication.update({
    where: { id: applicationId },
    data: {
      status,
      requiredDocumentsNote: (formData.get("requiredDocumentsNote") as string) || null,
      budgetNarrative: (formData.get("budgetNarrative") as string) || null,
      teamNotes: (formData.get("teamNotes") as string) || null,
      timelineNotes: (formData.get("timelineNotes") as string) || null,
      submissionNotes: (formData.get("submissionNotes") as string) || null,
      followUpNotes: (formData.get("followUpNotes") as string) || null,
      submittedAt: submittedAtRaw ? new Date(submittedAtRaw) : status === "SUBMITTED" ? new Date() : undefined,
    },
  });

  if (before?.status !== status) {
    await logAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: status === "SUBMITTED" ? "APPLICATION_SUBMITTED" : "APPLICATION_STATUS_CHANGED",
      resourceType: "EducationAccessApplication",
      resourceId: applicationId,
      result: "SUCCESS",
      before: { status: before?.status },
      after: { status },
    });

    // If the application was just marked submitted, reflect that on the
    // opportunity's own pipeline stage too, so the two stay in sync.
    if (status === "SUBMITTED") {
      await prisma.educationAccessFundingOpportunity.update({
        where: { id: application.opportunityId },
        data: { status: "SUBMITTED" },
      });
    }
  }

  revalidatePath(`/dashboard/admin/education-access/funding-center/applications/${applicationId}`);
}

export async function addQuestion(formData: FormData) {
  await requireActionPermission("funding_center.manage");
  const applicationId = formData.get("applicationId") as string;
  const question = formData.get("question") as string;
  if (!question?.trim()) return;

  const wordLimitRaw = formData.get("wordLimit") as string;
  const characterLimitRaw = formData.get("characterLimit") as string;

  await prisma.educationAccessApplicationQuestion.create({
    data: {
      applicationId,
      question: question.trim(),
      wordLimit: wordLimitRaw ? Number(wordLimitRaw) : undefined,
      characterLimit: characterLimitRaw ? Number(characterLimitRaw) : undefined,
    },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/applications/${applicationId}`);
}

export async function updateQuestion(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const questionId = formData.get("questionId") as string;
  const applicationId = formData.get("applicationId") as string;

  await prisma.educationAccessApplicationQuestion.update({
    where: { id: questionId },
    data: {
      response: (formData.get("response") as string) || null,
      status: (formData.get("status") as string) || "NOT_STARTED",
      internalNotes: (formData.get("internalNotes") as string) || null,
      lastUpdatedById: session.user.id,
    },
  });

  revalidatePath(`/dashboard/admin/education-access/funding-center/applications/${applicationId}`);
}
