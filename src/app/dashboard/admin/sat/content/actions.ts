"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

const optionSchema = z.object({ key: z.string(), text: z.string() });

const contentFieldsSchema = z.object({
  section: z.enum(["READING_WRITING", "MATH"]),
  domain: z.string().trim().min(1, "Domain is required."),
  skill: z.string().trim().optional(),
  questionType: z.enum(["MULTIPLE_CHOICE", "STUDENT_PRODUCED_RESPONSE"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  passage: z.string().trim().optional(),
  prompt: z.string().trim().min(1, "Prompt is required."),
  correctOption: z.string().trim().optional(),
  correctValue: z.string().trim().optional(),
  explanation: z.string().trim().optional(),
  estimatedTimeSec: z.coerce.number().int().optional(),
  tags: z.string().trim().optional(),
  sourceReference: z.string().trim().optional(),
});

function parseOptionsFromForm(formData: FormData) {
  const keys = ["A", "B", "C", "D"];
  const options: { key: string; text: string }[] = [];
  for (const key of keys) {
    const text = (formData.get(`option_${key}`) as string | null)?.trim();
    if (text) options.push({ key, text });
  }
  return z.array(optionSchema).min(2, "At least two answer options are required.").parse(options);
}

function parseFields(formData: FormData) {
  return contentFieldsSchema.parse({
    section: formData.get("section"),
    domain: formData.get("domain"),
    skill: (formData.get("skill") as string) || undefined,
    questionType: formData.get("questionType"),
    difficulty: formData.get("difficulty"),
    passage: (formData.get("passage") as string) || undefined,
    prompt: formData.get("prompt"),
    correctOption: (formData.get("correctOption") as string) || undefined,
    correctValue: (formData.get("correctValue") as string) || undefined,
    explanation: (formData.get("explanation") as string) || undefined,
    estimatedTimeSec: (formData.get("estimatedTimeSec") as string) || undefined,
    tags: (formData.get("tags") as string) || undefined,
    sourceReference: (formData.get("sourceReference") as string) || undefined,
  });
}

function parseTags(tags: string | undefined): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createSatContent(formData: FormData) {
  const session = await requireActionPermission("sat.create");
  const fields = parseFields(formData);
  const isMcq = fields.questionType === "MULTIPLE_CHOICE";
  const options = isMcq ? parseOptionsFromForm(formData) : [];

  if (isMcq && !options.some((o) => o.key === fields.correctOption)) {
    throw new Error("The correct answer must match one of the provided options.");
  }
  if (!isMcq && !fields.correctValue) {
    throw new Error("A correct numeric value is required for student-produced-response items.");
  }

  const content = await prisma.satContent.create({
    data: {
      section: fields.section,
      domain: fields.domain,
      skill: fields.skill ?? null,
      questionType: fields.questionType,
      difficulty: fields.difficulty,
      status: "DRAFT",
      passage: fields.passage ?? null,
      prompt: fields.prompt,
      options: isMcq ? (options as never) : undefined,
      correctOption: isMcq ? (fields.correctOption ?? null) : null,
      correctValue: isMcq ? null : (fields.correctValue ?? null),
      explanation: fields.explanation ?? null,
      estimatedTimeSec: fields.estimatedTimeSec ?? null,
      tags: parseTags(fields.tags),
      sourceReference: fields.sourceReference ?? null,
      createdById: session.user.id,
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "SAT_CONTENT_CREATED",
    resourceType: "SatContent",
    resourceId: content.id,
    result: "SUCCESS",
    after: { section: fields.section, domain: fields.domain, status: "DRAFT" },
  });

  revalidatePath("/dashboard/admin/sat/content");
  redirect(`/dashboard/admin/sat/content/${content.id}`);
}

export async function updateSatContent(formData: FormData) {
  const session = await requireActionPermission("sat.create");
  const id = formData.get("id") as string;
  const before = await prisma.satContent.findUniqueOrThrow({ where: { id } });

  const fields = parseFields(formData);
  const isMcq = fields.questionType === "MULTIPLE_CHOICE";
  const options = isMcq ? parseOptionsFromForm(formData) : [];

  if (isMcq && !options.some((o) => o.key === fields.correctOption)) {
    throw new Error("The correct answer must match one of the provided options.");
  }
  if (!isMcq && !fields.correctValue) {
    throw new Error("A correct numeric value is required for student-produced-response items.");
  }

  await prisma.satContent.update({
    where: { id },
    data: {
      section: fields.section,
      domain: fields.domain,
      skill: fields.skill ?? null,
      questionType: fields.questionType,
      difficulty: fields.difficulty,
      passage: fields.passage ?? null,
      prompt: fields.prompt,
      options: isMcq ? (options as never) : undefined,
      correctOption: isMcq ? (fields.correctOption ?? null) : null,
      correctValue: isMcq ? null : (fields.correctValue ?? null),
      explanation: fields.explanation ?? null,
      estimatedTimeSec: fields.estimatedTimeSec ?? null,
      tags: parseTags(fields.tags),
      sourceReference: fields.sourceReference ?? null,
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "SAT_CONTENT_EDITED",
    resourceType: "SatContent",
    resourceId: id,
    result: "SUCCESS",
    before: { prompt: before.prompt, section: before.section },
    after: { prompt: fields.prompt, section: fields.section },
  });

  revalidatePath("/dashboard/admin/sat/content");
  revalidatePath(`/dashboard/admin/sat/content/${id}`);
  redirect(`/dashboard/admin/sat/content/${id}`);
}

export async function submitSatContentForReview(formData: FormData) {
  const session = await requireActionPermission("sat.create");
  const id = formData.get("id") as string;
  const content = await prisma.satContent.findUniqueOrThrow({ where: { id } });
  if (content.status !== "DRAFT") throw new Error("Only draft content can be submitted for review.");

  await prisma.satContent.update({ where: { id }, data: { status: "NEEDS_REVIEW" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "SAT_CONTENT_SUBMITTED_FOR_REVIEW",
    resourceType: "SatContent",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/sat/content/${id}`);
  revalidatePath("/dashboard/admin/sat/content");
}

const APPROVABLE_STATUSES = ["DRAFT", "NEEDS_REVIEW"] as const;

export async function approveSatContent(formData: FormData) {
  const session = await requireActionPermission("sat.review");
  const id = formData.get("id") as string;

  if (!id) {
    redirect(`/dashboard/admin/sat/content?error=${encodeURIComponent("Missing content id.")}`);
  }

  const content = await prisma.satContent.findUnique({ where: { id } });
  if (!content) {
    redirect(`/dashboard/admin/sat/content?error=${encodeURIComponent("Content not found.")}`);
  }

  if (!APPROVABLE_STATUSES.includes(content.status as (typeof APPROVABLE_STATUSES)[number])) {
    redirect(
      `/dashboard/admin/sat/content/${id}?error=${encodeURIComponent(
        `This item is not eligible for approval — its status is ${content.status}.`
      )}`
    );
  }

  if (content.createdById === session.user.id) {
    redirect(
      `/dashboard/admin/sat/content/${id}?error=${encodeURIComponent(
        "You cannot approve content you created yourself — have another reviewer approve it."
      )}`
    );
  }

  await prisma.satContent.update({ where: { id }, data: { status: "APPROVED", reviewedById: session.user.id } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "SAT_CONTENT_APPROVED",
    resourceType: "SatContent",
    resourceId: id,
    result: "SUCCESS",
    before: { status: content.status },
    after: { status: "APPROVED" },
  });
  revalidatePath(`/dashboard/admin/sat/content/${id}`);
  revalidatePath("/dashboard/admin/sat/content");
  redirect(`/dashboard/admin/sat/content/${id}`);
}

export async function sendSatContentBack(formData: FormData) {
  const session = await requireActionPermission("sat.review");
  const id = formData.get("id") as string;
  const content = await prisma.satContent.findUniqueOrThrow({ where: { id } });
  if (content.status !== "NEEDS_REVIEW") throw new Error("Only content awaiting review can be sent back.");

  await prisma.satContent.update({ where: { id }, data: { status: "DRAFT" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "SAT_CONTENT_SENT_BACK",
    resourceType: "SatContent",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/sat/content/${id}`);
  revalidatePath("/dashboard/admin/sat/content");
}

export async function publishSatContent(formData: FormData) {
  const session = await requireActionPermission("sat.publish");
  const id = formData.get("id") as string;
  const content = await prisma.satContent.findUniqueOrThrow({ where: { id } });
  if (content.status !== "APPROVED") throw new Error("Only approved content can be published.");

  await prisma.satContent.update({ where: { id }, data: { status: "PUBLISHED" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "SAT_CONTENT_PUBLISHED",
    resourceType: "SatContent",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/sat/content/${id}`);
  revalidatePath("/dashboard/admin/sat/content");
}

export async function archiveSatContent(formData: FormData) {
  const session = await requireActionPermission("sat.archive");
  const id = formData.get("id") as string;
  await prisma.satContent.update({ where: { id }, data: { status: "ARCHIVED" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "SAT_CONTENT_ARCHIVED",
    resourceType: "SatContent",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/sat/content/${id}`);
  revalidatePath("/dashboard/admin/sat/content");
}

export async function restoreSatContent(formData: FormData) {
  const session = await requireActionPermission("sat.archive");
  const id = formData.get("id") as string;
  await prisma.satContent.update({ where: { id }, data: { status: "DRAFT" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "SAT_CONTENT_RESTORED",
    resourceType: "SatContent",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/sat/content/${id}`);
  revalidatePath("/dashboard/admin/sat/content");
}

export async function duplicateSatContent(formData: FormData) {
  const session = await requireActionPermission("sat.create");
  const id = formData.get("id") as string;
  const original = await prisma.satContent.findUniqueOrThrow({ where: { id } });

  const copy = await prisma.satContent.create({
    data: {
      section: original.section,
      domain: original.domain,
      skill: original.skill,
      questionType: original.questionType,
      difficulty: original.difficulty,
      status: "DRAFT",
      passage: original.passage,
      prompt: original.prompt,
      options: original.options as never,
      correctOption: original.correctOption,
      correctValue: original.correctValue,
      explanation: original.explanation,
      estimatedTimeSec: original.estimatedTimeSec,
      tags: original.tags,
      createdById: session.user.id,
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "SAT_CONTENT_DUPLICATED",
    resourceType: "SatContent",
    resourceId: copy.id,
    result: "SUCCESS",
    after: { duplicatedFrom: original.id },
  });

  revalidatePath("/dashboard/admin/sat/content");
  redirect(`/dashboard/admin/sat/content/${copy.id}`);
}
