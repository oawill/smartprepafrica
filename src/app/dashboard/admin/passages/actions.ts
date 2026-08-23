"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import { generatePassageCode } from "@/lib/admin/ids";

const PASSAGE_APPROVABLE_STATUSES = ["DRAFT", "NEEDS_REVIEW"] as const;

const passageFieldsSchema = z.object({
  exam: z.enum(["WAEC", "NECO", "UTME", "POST_UTME"]),
  subjectId: z.string().min(1),
  type: z.enum([
    "COMPREHENSION",
    "PROSE_EXTRACT",
    "POETRY",
    "DRAMA_EXTRACT",
    "DIALOGUE",
    "LITERARY_EXTRACT",
    "OTHER",
  ]),
  title: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  bodyText: z.string().trim().min(1, "Passage text is required."),
  showLineNumbers: z.coerce.boolean().optional(),
  startingLineNumber: z.coerce.number().int().min(1).optional(),
});

function parseFields(formData: FormData) {
  return passageFieldsSchema.parse({
    exam: formData.get("exam"),
    subjectId: formData.get("subjectId"),
    type: formData.get("type"),
    title: (formData.get("title") as string) || undefined,
    instructions: (formData.get("instructions") as string) || undefined,
    bodyText: formData.get("bodyText"),
    showLineNumbers: formData.get("showLineNumbers") === "on",
    startingLineNumber: (formData.get("startingLineNumber") as string) || undefined,
  });
}

export async function createPassage(formData: FormData) {
  const session = await requireActionPermission("questions.create");
  const fields = parseFields(formData);
  const code = await generatePassageCode();

  const passage = await prisma.passageGroup.create({
    data: {
      ...fields,
      showLineNumbers: fields.showLineNumbers ?? false,
      startingLineNumber: fields.startingLineNumber ?? 1,
      code,
      status: "DRAFT",
      createdById: session.user.id,
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PASSAGE_CREATED",
    resourceType: "PassageGroup",
    resourceId: passage.id,
    result: "SUCCESS",
    after: { code, status: "DRAFT" },
  });

  revalidatePath("/dashboard/admin/passages");
  redirect(`/dashboard/admin/passages/${passage.id}`);
}

export async function updatePassage(formData: FormData) {
  const session = await requireActionPermission("questions.edit");
  const id = formData.get("id") as string;
  const before = await prisma.passageGroup.findUniqueOrThrow({ where: { id } });
  const fields = parseFields(formData);

  await prisma.passageGroup.update({
    where: { id },
    data: {
      ...fields,
      showLineNumbers: fields.showLineNumbers ?? false,
      startingLineNumber: fields.startingLineNumber ?? 1,
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PASSAGE_EDITED",
    resourceType: "PassageGroup",
    resourceId: id,
    result: "SUCCESS",
    before: { title: before.title },
    after: { title: fields.title },
  });

  revalidatePath("/dashboard/admin/passages");
  revalidatePath(`/dashboard/admin/passages/${id}`);
  redirect(`/dashboard/admin/passages/${id}`);
}

export async function submitPassageForReview(formData: FormData) {
  const session = await requireActionPermission("questions.create");
  const id = formData.get("id") as string;
  const passage = await prisma.passageGroup.findUniqueOrThrow({ where: { id } });
  if (passage.status !== "DRAFT") throw new Error("Only draft passages can be submitted for review.");

  await prisma.passageGroup.update({ where: { id }, data: { status: "NEEDS_REVIEW" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PASSAGE_SUBMITTED_FOR_REVIEW",
    resourceType: "PassageGroup",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/passages/${id}`);
  revalidatePath("/dashboard/admin/passages");
}

export async function approvePassage(formData: FormData) {
  const session = await requireActionPermission("questions.approve");
  const id = formData.get("id") as string;

  if (!id) {
    redirect(`/dashboard/admin/passages?error=${encodeURIComponent("Missing passage id.")}`);
  }

  const passage = await prisma.passageGroup.findUnique({ where: { id } });
  if (!passage) {
    redirect(`/dashboard/admin/passages?error=${encodeURIComponent("Passage not found.")}`);
  }

  if (!PASSAGE_APPROVABLE_STATUSES.includes(passage.status as (typeof PASSAGE_APPROVABLE_STATUSES)[number])) {
    redirect(
      `/dashboard/admin/passages/${id}?error=${encodeURIComponent(
        `This passage is not eligible for approval — its status is ${passage.status}.`
      )}`
    );
  }

  if (passage.createdById === session.user.id) {
    redirect(
      `/dashboard/admin/passages/${id}?error=${encodeURIComponent(
        "You cannot approve a passage you created yourself — have another reviewer approve it."
      )}`
    );
  }

  await prisma.passageGroup.update({ where: { id }, data: { status: "APPROVED" } });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PASSAGE_APPROVED",
    resourceType: "PassageGroup",
    resourceId: id,
    result: "SUCCESS",
    before: { status: passage.status },
    after: { status: "APPROVED" },
  });
  revalidatePath(`/dashboard/admin/passages/${id}`);
  revalidatePath("/dashboard/admin/passages");
  redirect(`/dashboard/admin/passages/${id}`);
}

export async function sendPassageBackForChanges(formData: FormData) {
  const session = await requireActionPermission("questions.approve");
  const id = formData.get("id") as string;
  const passage = await prisma.passageGroup.findUniqueOrThrow({ where: { id } });
  if (passage.status !== "NEEDS_REVIEW") throw new Error("Only passages awaiting review can be sent back.");

  await prisma.passageGroup.update({ where: { id }, data: { status: "DRAFT" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PASSAGE_SENT_BACK",
    resourceType: "PassageGroup",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/passages/${id}`);
  revalidatePath("/dashboard/admin/passages");
}

export async function publishPassage(formData: FormData) {
  const session = await requireActionPermission("questions.publish");
  const id = formData.get("id") as string;
  const passage = await prisma.passageGroup.findUniqueOrThrow({ where: { id } });
  if (passage.status !== "APPROVED") throw new Error("Only approved passages can be published.");

  await prisma.passageGroup.update({ where: { id }, data: { status: "PUBLISHED" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PASSAGE_PUBLISHED",
    resourceType: "PassageGroup",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/passages/${id}`);
  revalidatePath("/dashboard/admin/passages");
}

export async function archivePassage(formData: FormData) {
  const session = await requireActionPermission("questions.archive");
  const id = formData.get("id") as string;
  await prisma.passageGroup.update({ where: { id }, data: { status: "ARCHIVED" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PASSAGE_ARCHIVED",
    resourceType: "PassageGroup",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/passages/${id}`);
  revalidatePath("/dashboard/admin/passages");
}

export async function restorePassage(formData: FormData) {
  const session = await requireActionPermission("questions.archive");
  const id = formData.get("id") as string;
  await prisma.passageGroup.update({ where: { id }, data: { status: "DRAFT" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PASSAGE_RESTORED",
    resourceType: "PassageGroup",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/passages/${id}`);
  revalidatePath("/dashboard/admin/passages");
}

/** Attaches an existing standalone question to this passage, appending it to
 * the end (count-then-create, same convention as Module/Lesson ordering).
 * Only ever moves a question INTO a group — never touches the question's
 * own content fields. */
export async function attachQuestionToPassage(formData: FormData) {
  const session = await requireActionPermission("questions.edit");
  const passageGroupId = formData.get("passageGroupId") as string;
  const questionIdOrNumber = ((formData.get("question") as string) || "").trim();

  if (!questionIdOrNumber) {
    redirect(
      `/dashboard/admin/passages/${passageGroupId}?error=${encodeURIComponent("Enter a question ID or reference number.")}`
    );
  }

  const question = await prisma.question.findFirst({
    where: { OR: [{ id: questionIdOrNumber }, { questionNumber: questionIdOrNumber }] },
  });

  if (!question) {
    redirect(
      `/dashboard/admin/passages/${passageGroupId}?error=${encodeURIComponent("No question found with that ID or reference number.")}`
    );
  }

  if (question.passageGroupId) {
    redirect(
      `/dashboard/admin/passages/${passageGroupId}?error=${encodeURIComponent(
        "That question is already attached to a passage — detach it first."
      )}`
    );
  }

  const count = await prisma.question.count({ where: { passageGroupId } });
  await prisma.question.update({
    where: { id: question.id },
    data: { passageGroupId, passageOrder: count },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTION_ATTACHED_TO_PASSAGE",
    resourceType: "Question",
    resourceId: question.id,
    result: "SUCCESS",
    after: { passageGroupId },
  });

  revalidatePath(`/dashboard/admin/passages/${passageGroupId}`);
}

export async function detachQuestionFromPassage(formData: FormData) {
  const session = await requireActionPermission("questions.edit");
  const questionId = formData.get("questionId") as string;
  const passageGroupId = formData.get("passageGroupId") as string;

  await prisma.question.update({
    where: { id: questionId },
    data: { passageGroupId: null, passageOrder: null, passageLineRef: null, passageLineStart: null, passageLineEnd: null },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "QUESTION_DETACHED_FROM_PASSAGE",
    resourceType: "Question",
    resourceId: questionId,
    result: "SUCCESS",
  });

  revalidatePath(`/dashboard/admin/passages/${passageGroupId}`);
}

/** Swaps a question's passageOrder with its immediate neighbor in the
 * requested direction, inside a transaction so a concurrent reorder can't
 * produce a duplicate order value. */
export async function reorderPassageQuestion(formData: FormData) {
  const session = await requireActionPermission("questions.edit");
  const questionId = formData.get("questionId") as string;
  const passageGroupId = formData.get("passageGroupId") as string;
  const direction = formData.get("direction") as "up" | "down";

  await prisma.$transaction(async (tx) => {
    const members = await tx.question.findMany({
      where: { passageGroupId },
      orderBy: { passageOrder: "asc" },
      select: { id: true, passageOrder: true },
    });
    const i = members.findIndex((m) => m.id === questionId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= members.length) return;

    await tx.question.update({ where: { id: members[i].id }, data: { passageOrder: members[j].passageOrder } });
    await tx.question.update({ where: { id: members[j].id }, data: { passageOrder: members[i].passageOrder } });
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PASSAGE_QUESTIONS_REORDERED",
    resourceType: "PassageGroup",
    resourceId: passageGroupId,
    result: "SUCCESS",
  });

  revalidatePath(`/dashboard/admin/passages/${passageGroupId}`);
}
