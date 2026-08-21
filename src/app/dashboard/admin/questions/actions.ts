"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import { generateQuestionNumber } from "@/lib/admin/ids";
import type { BulkResult } from "@/lib/admin/bulk-types";

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

/** Statuses a question can be approved from. Widened from NEEDS_REVIEW-only
 * so a draft can be approved directly, without forcing every question
 * through the separate "submit for review" step first. */
const APPROVABLE_STATUSES = ["DRAFT", "NEEDS_REVIEW"] as const;

export async function approveQuestion(formData: FormData) {
  const session = await requireActionPermission("questions.approve");
  const id = formData.get("id") as string;

  // Previously this whole function threw plain Errors for expected
  // failures (wrong status, self-approval). A thrown error from a Server
  // Action bound to <form action={...}> is uncaught by the framework and
  // surfaces as a generic 500 + the app's global error boundary — losing
  // the actual reason. Redirecting back with an ?error= message instead
  // keeps the page alive and shows the real reason inline.
  if (!id) {
    redirect(`/dashboard/admin/questions?error=${encodeURIComponent("Missing question id.")}`);
  }

  const question = await prisma.question.findUnique({ where: { id } });

  if (!question) {
    redirect(`/dashboard/admin/questions?error=${encodeURIComponent("Question not found.")}`);
  }

  if (!APPROVABLE_STATUSES.includes(question.status as (typeof APPROVABLE_STATUSES)[number])) {
    redirect(
      `/dashboard/admin/questions/${id}?error=${encodeURIComponent(
        `This question is not eligible for approval — its status is ${question.status}.`
      )}`
    );
  }

  if (question.createdById === session.user.id) {
    redirect(
      `/dashboard/admin/questions/${id}?error=${encodeURIComponent(
        "You cannot approve a question you created yourself — have another reviewer approve it."
      )}`
    );
  }

  let saveFailed = false;
  try {
    await prisma.question.update({
      where: { id },
      data: { status: "APPROVED", reviewedById: session.user.id, reviewedAt: new Date() },
    });
  } catch (err) {
    // Genuinely unexpected (DB constraint, connection issue, etc). Log the
    // full detail server-side; never forward it to the client.
    console.error(`approveQuestion: failed to update question ${id}`, err);
    saveFailed = true;
  }

  if (saveFailed) {
    redirect(
      `/dashboard/admin/questions/${id}?error=${encodeURIComponent(
        "Could not save the approval due to a server error — please try again."
      )}`
    );
  }

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTION_APPROVED",
    resourceType: "Question",
    resourceId: id,
    result: "SUCCESS",
    before: { status: question.status },
    after: { status: "APPROVED" },
  });
  revalidatePath(`/dashboard/admin/questions/${id}`);
  revalidatePath("/dashboard/admin/questions");
  redirect(`/dashboard/admin/questions/${id}`);
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

/** Archives a set of questions in one batched write. Any status can move to
 * ARCHIVED, so the only failure case is an id that doesn't exist. */
export async function bulkArchiveQuestions(ids: string[]): Promise<BulkResult> {
  const session = await requireActionPermission("questions.archive");
  if (ids.length === 0) return { updatedCount: 0, failed: [] };

  const found = await prisma.question.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const foundIds = new Set(found.map((q) => q.id));
  const failed = ids.filter((id) => !foundIds.has(id)).map((id) => ({ id, reason: "Not found" }));
  const eligibleIds = ids.filter((id) => foundIds.has(id));

  if (eligibleIds.length > 0) {
    await prisma.question.updateMany({ where: { id: { in: eligibleIds } }, data: { status: "ARCHIVED" } });
  }

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTIONS_BULK_ARCHIVED",
    resourceType: "Question",
    result: "SUCCESS",
    after: { updatedIds: eligibleIds, failedIds: failed.map((f) => f.id) },
  });

  revalidatePath("/dashboard/admin/questions");
  return { updatedCount: eligibleIds.length, failed };
}

/** Approves a set of questions (from Draft or Needs Review) in one batched
 * write. Eligibility (status + not-self-created) is re-checked here
 * server-side per id, inside a transaction so the read-then-write can't
 * race a concurrent status change — the frontend selection is never
 * trusted. Duplicate ids in the input are de-duplicated; ids that don't
 * exist, aren't eligible, or belong to the caller's own submission are
 * reported back individually rather than failing the whole batch. */
export async function bulkApproveQuestions(rawIds: string[]): Promise<BulkResult> {
  const session = await requireActionPermission("questions.approve");
  const ids = Array.from(new Set(rawIds));
  if (ids.length === 0) return { updatedCount: 0, failed: [] };

  const { failed, eligibleIds } = await prisma.$transaction(async (tx) => {
    const found = await tx.question.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, createdById: true },
    });
    const foundById = new Map(found.map((q) => [q.id, q]));

    const failed: { id: string; reason: string }[] = [];
    const eligibleIds: string[] = [];

    for (const id of ids) {
      const question = foundById.get(id);
      if (!question) {
        failed.push({ id, reason: "Not found" });
      } else if (!APPROVABLE_STATUSES.includes(question.status as (typeof APPROVABLE_STATUSES)[number])) {
        failed.push({ id, reason: `Not eligible — currently ${question.status}` });
      } else if (question.createdById === session.user.id) {
        failed.push({ id, reason: "Cannot approve a question you created yourself" });
      } else {
        eligibleIds.push(id);
      }
    }

    if (eligibleIds.length > 0) {
      await tx.question.updateMany({
        where: { id: { in: eligibleIds } },
        data: { status: "APPROVED", reviewedById: session.user.id, reviewedAt: new Date() },
      });
    }

    return { failed, eligibleIds };
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTIONS_BULK_APPROVED",
    resourceType: "Question",
    result: "SUCCESS",
    after: { updatedIds: eligibleIds, failedIds: failed.map((f) => f.id) },
  });

  revalidatePath("/dashboard/admin/questions");
  return { updatedCount: eligibleIds.length, failed };
}

/** Publishes a set of questions in one batched write. Only questions
 * currently APPROVED are eligible — anything else is reported as a partial
 * failure with the reason, rather than silently skipped or force-moved. */
export async function bulkPublishQuestions(ids: string[]): Promise<BulkResult> {
  const session = await requireActionPermission("questions.publish");
  if (ids.length === 0) return { updatedCount: 0, failed: [] };

  const found = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true },
  });
  const foundById = new Map(found.map((q) => [q.id, q]));

  const failed: { id: string; reason: string }[] = [];
  const eligibleIds: string[] = [];

  for (const id of ids) {
    const question = foundById.get(id);
    if (!question) failed.push({ id, reason: "Not found" });
    else if (question.status !== "APPROVED") failed.push({ id, reason: `Not approved (currently ${question.status})` });
    else eligibleIds.push(id);
  }

  if (eligibleIds.length > 0) {
    await prisma.question.updateMany({ where: { id: { in: eligibleIds } }, data: { status: "PUBLISHED" } });
  }

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTIONS_BULK_PUBLISHED",
    resourceType: "Question",
    result: "SUCCESS",
    after: { updatedIds: eligibleIds, failedIds: failed.map((f) => f.id) },
  });

  revalidatePath("/dashboard/admin/questions");
  return { updatedCount: eligibleIds.length, failed };
}
