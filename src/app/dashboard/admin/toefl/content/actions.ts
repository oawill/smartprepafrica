"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

const optionSchema = z.object({ key: z.string(), text: z.string() });

const contentFieldsSchema = z.object({
  skill: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING"]),
  taskType: z.string().trim().min(1, "Task type is required."),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  prompt: z.string().trim().min(1, "Prompt is required."),
  passage: z.string().trim().optional(),
  audioUrl: z.string().trim().optional(),
  audioDurationSec: z.coerce.number().optional(),
  transcript: z.string().trim().optional(),
  correctOption: z.string().trim().optional(),
  explanation: z.string().trim().optional(),
  estimatedTimeSec: z.coerce.number().int().optional(),
  tags: z.string().trim().optional(),
});

/** Reading/Listening are the only skills with multiple-choice options
 * today — Writing/Speaking are free-response, matching exactly what the
 * seed scripts populate (scripts/seed-toefl-writing-content.ts and
 * seed-toefl-speaking-content.ts never set options/correctOption). */
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
    skill: formData.get("skill"),
    taskType: formData.get("taskType"),
    difficulty: formData.get("difficulty"),
    prompt: formData.get("prompt"),
    passage: (formData.get("passage") as string) || undefined,
    audioUrl: (formData.get("audioUrl") as string) || undefined,
    audioDurationSec: (formData.get("audioDurationSec") as string) || undefined,
    transcript: (formData.get("transcript") as string) || undefined,
    correctOption: (formData.get("correctOption") as string) || undefined,
    explanation: (formData.get("explanation") as string) || undefined,
    estimatedTimeSec: (formData.get("estimatedTimeSec") as string) || undefined,
    tags: (formData.get("tags") as string) || undefined,
  });
}

function parseTags(tags: string | undefined): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createToeflContent(formData: FormData) {
  const session = await requireActionPermission("toefl.create");
  const fields = parseFields(formData);
  const isMcq = fields.skill === "READING" || fields.skill === "LISTENING";
  const options = isMcq ? parseOptionsFromForm(formData) : [];

  if (isMcq && !options.some((o) => o.key === fields.correctOption)) {
    throw new Error("The correct answer must match one of the provided options.");
  }

  const content = await prisma.toeflContent.create({
    data: {
      skill: fields.skill,
      taskType: fields.taskType,
      difficulty: fields.difficulty,
      status: "DRAFT",
      prompt: fields.prompt,
      passage: fields.passage ?? null,
      audioUrl: fields.audioUrl ?? null,
      audioDurationSec: fields.audioDurationSec ?? null,
      transcript: fields.transcript ?? null,
      options: isMcq ? (options as never) : undefined,
      correctOption: isMcq ? (fields.correctOption ?? null) : null,
      explanation: fields.explanation ?? null,
      estimatedTimeSec: fields.estimatedTimeSec ?? null,
      tags: parseTags(fields.tags),
      createdById: session.user.id,
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TOEFL_CONTENT_CREATED",
    resourceType: "ToeflContent",
    resourceId: content.id,
    result: "SUCCESS",
    after: { skill: fields.skill, taskType: fields.taskType, status: "DRAFT" },
  });

  revalidatePath("/dashboard/admin/toefl/content");
  redirect(`/dashboard/admin/toefl/content/${content.id}`);
}

export async function updateToeflContent(formData: FormData) {
  const session = await requireActionPermission("toefl.create");
  const id = formData.get("id") as string;
  const before = await prisma.toeflContent.findUniqueOrThrow({ where: { id } });

  const fields = parseFields(formData);
  const isMcq = fields.skill === "READING" || fields.skill === "LISTENING";
  const options = isMcq ? parseOptionsFromForm(formData) : [];

  if (isMcq && !options.some((o) => o.key === fields.correctOption)) {
    throw new Error("The correct answer must match one of the provided options.");
  }

  await prisma.toeflContent.update({
    where: { id },
    data: {
      skill: fields.skill,
      taskType: fields.taskType,
      difficulty: fields.difficulty,
      prompt: fields.prompt,
      passage: fields.passage ?? null,
      audioUrl: fields.audioUrl ?? null,
      audioDurationSec: fields.audioDurationSec ?? null,
      transcript: fields.transcript ?? null,
      options: isMcq ? (options as never) : Prisma.JsonNull,
      correctOption: isMcq ? (fields.correctOption ?? null) : null,
      explanation: fields.explanation ?? null,
      estimatedTimeSec: fields.estimatedTimeSec ?? null,
      tags: parseTags(fields.tags),
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TOEFL_CONTENT_EDITED",
    resourceType: "ToeflContent",
    resourceId: id,
    result: "SUCCESS",
    before: { prompt: before.prompt, skill: before.skill },
    after: { prompt: fields.prompt, skill: fields.skill },
  });

  revalidatePath("/dashboard/admin/toefl/content");
  revalidatePath(`/dashboard/admin/toefl/content/${id}`);
  redirect(`/dashboard/admin/toefl/content/${id}`);
}

export async function submitToeflContentForReview(formData: FormData) {
  const session = await requireActionPermission("toefl.create");
  const id = formData.get("id") as string;
  const content = await prisma.toeflContent.findUniqueOrThrow({ where: { id } });
  if (content.status !== "DRAFT") throw new Error("Only draft content can be submitted for review.");

  await prisma.toeflContent.update({ where: { id }, data: { status: "NEEDS_REVIEW" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TOEFL_CONTENT_SUBMITTED_FOR_REVIEW",
    resourceType: "ToeflContent",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/toefl/content/${id}`);
  revalidatePath("/dashboard/admin/toefl/content");
}

const APPROVABLE_STATUSES = ["DRAFT", "NEEDS_REVIEW"] as const;

export async function approveToeflContent(formData: FormData) {
  const session = await requireActionPermission("toefl.review");
  const id = formData.get("id") as string;

  // A thrown Error from a Server Action bound to <form action={...}> is
  // uncaught by the framework and surfaces as a generic 500 — same fix
  // already applied to approveQuestion, reused here rather than
  // rediscovering it.
  if (!id) {
    redirect(`/dashboard/admin/toefl/content?error=${encodeURIComponent("Missing content id.")}`);
  }

  const content = await prisma.toeflContent.findUnique({ where: { id } });
  if (!content) {
    redirect(`/dashboard/admin/toefl/content?error=${encodeURIComponent("Content not found.")}`);
  }

  if (!APPROVABLE_STATUSES.includes(content.status as (typeof APPROVABLE_STATUSES)[number])) {
    redirect(
      `/dashboard/admin/toefl/content/${id}?error=${encodeURIComponent(
        `This item is not eligible for approval — its status is ${content.status}.`
      )}`
    );
  }

  if (content.createdById === session.user.id) {
    redirect(
      `/dashboard/admin/toefl/content/${id}?error=${encodeURIComponent(
        "You cannot approve content you created yourself — have another reviewer approve it."
      )}`
    );
  }

  await prisma.toeflContent.update({ where: { id }, data: { status: "APPROVED" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TOEFL_CONTENT_APPROVED",
    resourceType: "ToeflContent",
    resourceId: id,
    result: "SUCCESS",
    before: { status: content.status },
    after: { status: "APPROVED" },
  });
  revalidatePath(`/dashboard/admin/toefl/content/${id}`);
  revalidatePath("/dashboard/admin/toefl/content");
  redirect(`/dashboard/admin/toefl/content/${id}`);
}

export async function sendToeflContentBack(formData: FormData) {
  const session = await requireActionPermission("toefl.review");
  const id = formData.get("id") as string;
  const content = await prisma.toeflContent.findUniqueOrThrow({ where: { id } });
  if (content.status !== "NEEDS_REVIEW") throw new Error("Only content awaiting review can be sent back.");

  await prisma.toeflContent.update({ where: { id }, data: { status: "DRAFT" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TOEFL_CONTENT_SENT_BACK",
    resourceType: "ToeflContent",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/toefl/content/${id}`);
  revalidatePath("/dashboard/admin/toefl/content");
}

export async function publishToeflContent(formData: FormData) {
  const session = await requireActionPermission("toefl.publish");
  const id = formData.get("id") as string;
  const content = await prisma.toeflContent.findUniqueOrThrow({ where: { id } });
  if (content.status !== "APPROVED") throw new Error("Only approved content can be published.");

  await prisma.toeflContent.update({ where: { id }, data: { status: "PUBLISHED" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TOEFL_CONTENT_PUBLISHED",
    resourceType: "ToeflContent",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/toefl/content/${id}`);
  revalidatePath("/dashboard/admin/toefl/content");
}

export async function archiveToeflContent(formData: FormData) {
  const session = await requireActionPermission("toefl.archive");
  const id = formData.get("id") as string;
  await prisma.toeflContent.update({ where: { id }, data: { status: "ARCHIVED" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TOEFL_CONTENT_ARCHIVED",
    resourceType: "ToeflContent",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/toefl/content/${id}`);
  revalidatePath("/dashboard/admin/toefl/content");
}

export async function restoreToeflContent(formData: FormData) {
  const session = await requireActionPermission("toefl.archive");
  const id = formData.get("id") as string;
  await prisma.toeflContent.update({ where: { id }, data: { status: "DRAFT" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TOEFL_CONTENT_RESTORED",
    resourceType: "ToeflContent",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/toefl/content/${id}`);
  revalidatePath("/dashboard/admin/toefl/content");
}

export async function duplicateToeflContent(formData: FormData) {
  const session = await requireActionPermission("toefl.create");
  const id = formData.get("id") as string;
  const original = await prisma.toeflContent.findUniqueOrThrow({ where: { id } });

  const copy = await prisma.toeflContent.create({
    data: {
      skill: original.skill,
      taskType: original.taskType,
      difficulty: original.difficulty,
      status: "DRAFT",
      prompt: original.prompt,
      passage: original.passage,
      audioUrl: original.audioUrl,
      audioDurationSec: original.audioDurationSec,
      transcript: original.transcript,
      options: original.options as never,
      correctOption: original.correctOption,
      explanation: original.explanation,
      estimatedTimeSec: original.estimatedTimeSec,
      tags: original.tags,
      createdById: session.user.id,
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "TOEFL_CONTENT_DUPLICATED",
    resourceType: "ToeflContent",
    resourceId: copy.id,
    result: "SUCCESS",
    after: { duplicatedFrom: original.id },
  });

  revalidatePath("/dashboard/admin/toefl/content");
  redirect(`/dashboard/admin/toefl/content/${copy.id}`);
}
