"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import { generateQuestionNumber } from "@/lib/admin/ids";

const optionSchema = z.object({ key: z.string(), text: z.string() });

const questionFieldsSchema = z.object({
  exam: z.enum(["WAEC", "NECO", "UTME", "POST_UTME"]),
  subjectId: z.string().min(1),
  topic: z.string().trim().optional(),
  subtopic: z.string().trim().optional(),
  grade: z.string().trim().optional(),
  year: z.coerce.number().int().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  prompt: z.string().trim().min(1, "Question text is required."),
  imageUrl: z.string().trim().optional(),
  correctOption: z.string().min(1),
  explanation: z.string().trim().optional(),
  sourceType: z.enum([
    "OFFICIAL_PAST_QUESTION",
    "LICENSED_QUESTION",
    "ORIGINAL_SMARTPREP_QUESTION",
    "TEACHER_CREATED",
    "AI_GENERATED",
    "IMPORTED",
  ]),
});

function parseOptionsFromForm(formData: FormData) {
  const keys = ["A", "B", "C", "D", "E"];
  const options: { key: string; text: string }[] = [];
  for (const key of keys) {
    const text = (formData.get(`option_${key}`) as string | null)?.trim();
    if (text) options.push({ key, text });
  }
  return z.array(optionSchema).min(2, "At least two answer options are required.").parse(options);
}

function parseFields(formData: FormData) {
  return questionFieldsSchema.parse({
    exam: formData.get("exam"),
    subjectId: formData.get("subjectId"),
    topic: (formData.get("topic") as string) || undefined,
    subtopic: (formData.get("subtopic") as string) || undefined,
    grade: (formData.get("grade") as string) || undefined,
    year: (formData.get("year") as string) || undefined,
    difficulty: formData.get("difficulty"),
    prompt: formData.get("prompt"),
    imageUrl: (formData.get("imageUrl") as string) || undefined,
    correctOption: formData.get("correctOption"),
    explanation: (formData.get("explanation") as string) || undefined,
    sourceType: formData.get("sourceType"),
  });
}

/** Exact-match duplicate flag: same subject, exam, and normalized prompt
 * text. Never auto-deletes — just links duplicateOfId so a reviewer can
 * decide. A stricter fuzzy match is out of scope for this pass. */
async function findLikelyDuplicate(subjectId: string, exam: string, prompt: string, excludeId?: string) {
  const normalized = prompt.trim().toLowerCase();
  const candidates = await prisma.question.findMany({
    where: { subjectId, exam: exam as never, id: excludeId ? { not: excludeId } : undefined },
    select: { id: true, prompt: true },
    take: 500,
  });
  return candidates.find((c) => c.prompt.trim().toLowerCase() === normalized)?.id ?? null;
}

export async function createQuestion(formData: FormData) {
  const session = await requireActionPermission("questions.create");
  const fields = parseFields(formData);
  const options = parseOptionsFromForm(formData);

  if (!options.some((o) => o.key === fields.correctOption)) {
    throw new Error("The correct answer must match one of the provided options.");
  }

  const duplicateOfId = await findLikelyDuplicate(fields.subjectId, fields.exam, fields.prompt);
  const questionNumber = await generateQuestionNumber();

  const question = await prisma.question.create({
    data: {
      ...fields,
      options: options as never,
      questionNumber,
      status: "DRAFT",
      createdById: session.user.id,
      duplicateOfId,
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTION_CREATED",
    resourceType: "Question",
    resourceId: question.id,
    result: "SUCCESS",
    after: { questionNumber, status: "DRAFT", duplicateOfId },
  });

  revalidatePath("/dashboard/admin/questions");
  redirect(`/dashboard/admin/questions/${question.id}`);
}

export async function updateQuestion(formData: FormData) {
  const session = await requireActionPermission("questions.edit");
  const id = formData.get("id") as string;
  const before = await prisma.question.findUniqueOrThrow({ where: { id } });

  const fields = parseFields(formData);
  const options = parseOptionsFromForm(formData);
  if (!options.some((o) => o.key === fields.correctOption)) {
    throw new Error("The correct answer must match one of the provided options.");
  }

  const duplicateOfId = await findLikelyDuplicate(fields.subjectId, fields.exam, fields.prompt, id);

  await prisma.question.update({
    where: { id },
    data: { ...fields, options: options as never, duplicateOfId },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTION_EDITED",
    resourceType: "Question",
    resourceId: id,
    result: "SUCCESS",
    before: { prompt: before.prompt, correctOption: before.correctOption },
    after: { prompt: fields.prompt, correctOption: fields.correctOption },
  });

  revalidatePath("/dashboard/admin/questions");
  revalidatePath(`/dashboard/admin/questions/${id}`);
  redirect(`/dashboard/admin/questions/${id}`);
}

export async function submitForReview(formData: FormData) {
  const session = await requireActionPermission("questions.create");
  const id = formData.get("id") as string;
  const question = await prisma.question.findUniqueOrThrow({ where: { id } });
  if (question.status !== "DRAFT") throw new Error("Only draft questions can be submitted for review.");

  await prisma.question.update({ where: { id }, data: { status: "NEEDS_REVIEW" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTION_SUBMITTED_FOR_REVIEW",
    resourceType: "Question",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/questions/${id}`);
  revalidatePath("/dashboard/admin/questions");
}

export async function approveQuestion(formData: FormData) {
  const session = await requireActionPermission("questions.approve");
  const id = formData.get("id") as string;
  const question = await prisma.question.findUniqueOrThrow({ where: { id } });
  if (question.status !== "NEEDS_REVIEW") throw new Error("Only questions awaiting review can be approved.");
  if (question.createdById === session.user.id) {
    throw new Error("You cannot approve a question you created yourself — have another reviewer approve it.");
  }

  await prisma.question.update({
    where: { id },
    data: { status: "APPROVED", reviewedById: session.user.id, reviewedAt: new Date() },
  });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTION_APPROVED",
    resourceType: "Question",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/questions/${id}`);
  revalidatePath("/dashboard/admin/questions");
}

export async function sendBackForChanges(formData: FormData) {
  const session = await requireActionPermission("questions.approve");
  const id = formData.get("id") as string;
  const reason = ((formData.get("reason") as string) || "").trim();
  const question = await prisma.question.findUniqueOrThrow({ where: { id } });
  if (question.status !== "NEEDS_REVIEW") throw new Error("Only questions awaiting review can be sent back.");

  await prisma.question.update({ where: { id }, data: { status: "DRAFT" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTION_SENT_BACK",
    resourceType: "Question",
    resourceId: id,
    result: "SUCCESS",
    after: { reason },
  });
  revalidatePath(`/dashboard/admin/questions/${id}`);
  revalidatePath("/dashboard/admin/questions");
}

export async function publishQuestion(formData: FormData) {
  const session = await requireActionPermission("questions.publish");
  const id = formData.get("id") as string;
  const question = await prisma.question.findUniqueOrThrow({ where: { id } });
  if (question.status !== "APPROVED") throw new Error("Only approved questions can be published.");

  await prisma.question.update({ where: { id }, data: { status: "PUBLISHED" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTION_PUBLISHED",
    resourceType: "Question",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/questions/${id}`);
  revalidatePath("/dashboard/admin/questions");
}

export async function archiveQuestion(formData: FormData) {
  const session = await requireActionPermission("questions.archive");
  const id = formData.get("id") as string;
  await prisma.question.update({ where: { id }, data: { status: "ARCHIVED" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTION_ARCHIVED",
    resourceType: "Question",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/questions/${id}`);
  revalidatePath("/dashboard/admin/questions");
}

export async function restoreQuestion(formData: FormData) {
  const session = await requireActionPermission("questions.archive");
  const id = formData.get("id") as string;
  await prisma.question.update({ where: { id }, data: { status: "DRAFT" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTION_RESTORED",
    resourceType: "Question",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/questions/${id}`);
  revalidatePath("/dashboard/admin/questions");
}

export async function duplicateQuestion(formData: FormData) {
  const session = await requireActionPermission("questions.create");
  const id = formData.get("id") as string;
  const original = await prisma.question.findUniqueOrThrow({ where: { id } });
  const questionNumber = await generateQuestionNumber();

  const copy = await prisma.question.create({
    data: {
      exam: original.exam,
      subjectId: original.subjectId,
      topic: original.topic,
      subtopic: original.subtopic,
      grade: original.grade,
      year: original.year,
      difficulty: original.difficulty,
      prompt: original.prompt,
      imageUrl: original.imageUrl,
      options: original.options as never,
      correctOption: original.correctOption,
      explanation: original.explanation,
      sourceType: original.sourceType,
      questionNumber,
      status: "DRAFT",
      createdById: session.user.id,
      duplicateOfId: original.id,
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTION_DUPLICATED",
    resourceType: "Question",
    resourceId: copy.id,
    result: "SUCCESS",
    after: { duplicatedFrom: original.id },
  });

  revalidatePath("/dashboard/admin/questions");
  redirect(`/dashboard/admin/questions/${copy.id}`);
}
