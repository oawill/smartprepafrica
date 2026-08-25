"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";
import type { BulkResult } from "@/lib/admin/bulk-types";

/** Approval is allowed directly from DRAFT too, same widened precedent as
 * the Questions admin (not every piece of content is forced through a
 * mandatory "submit for review" step first before an admin can act). */
const APPROVABLE_STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW"] as const;

export async function approveLesson(formData: FormData) {
  const session = await requireActionPermission("lessons.approve");
  const id = formData.get("id") as string;

  if (!id) {
    redirect(`/dashboard/admin/learning/lessons?error=${encodeURIComponent("Missing lesson id.")}`);
  }

  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) {
    redirect(`/dashboard/admin/learning/lessons?error=${encodeURIComponent("Lesson not found.")}`);
  }

  if (!APPROVABLE_STATUSES.includes(lesson.moderationStatus as (typeof APPROVABLE_STATUSES)[number])) {
    redirect(
      `/dashboard/admin/learning/lessons/${id}?error=${encodeURIComponent(
        `This lesson is not eligible for approval — its status is ${lesson.moderationStatus}.`
      )}`
    );
  }

  await prisma.lesson.update({
    where: { id },
    data: {
      moderationStatus: "APPROVED",
      moderationReason: null,
      moderatedById: session.user.id,
      moderatedAt: new Date(),
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "LESSON_APPROVED",
    resourceType: "Lesson",
    resourceId: id,
    result: "SUCCESS",
    before: { moderationStatus: lesson.moderationStatus },
    after: { moderationStatus: "APPROVED" },
  });

  revalidatePath(`/dashboard/admin/learning/lessons/${id}`);
  revalidatePath("/dashboard/admin/learning/lessons");
  redirect(`/dashboard/admin/learning/lessons/${id}`);
}

export async function sendLessonBackForChanges(formData: FormData) {
  const session = await requireActionPermission("lessons.approve");
  const id = formData.get("id") as string;
  const reason = ((formData.get("reason") as string) || "").trim();
  if (!reason) {
    redirect(
      `/dashboard/admin/learning/lessons/${id}?error=${encodeURIComponent("A reason is required when sending a lesson back.")}`
    );
  }

  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id } });

  await prisma.lesson.update({
    where: { id },
    data: {
      moderationStatus: "NEEDS_CHANGES",
      moderationReason: reason,
      moderatedById: session.user.id,
      moderatedAt: new Date(),
    },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "LESSON_SENT_BACK",
    resourceType: "Lesson",
    resourceId: id,
    result: "SUCCESS",
    before: { moderationStatus: lesson.moderationStatus },
    after: { moderationStatus: "NEEDS_CHANGES", reason },
  });

  revalidatePath(`/dashboard/admin/learning/lessons/${id}`);
  revalidatePath("/dashboard/admin/learning/lessons");
}

export async function publishLesson(formData: FormData) {
  const session = await requireActionPermission("lessons.publish");
  const id = formData.get("id") as string;
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id } });

  if (lesson.moderationStatus !== "APPROVED") {
    redirect(
      `/dashboard/admin/learning/lessons/${id}?error=${encodeURIComponent("Only approved lessons can be published.")}`
    );
  }

  await prisma.lesson.update({ where: { id }, data: { moderationStatus: "PUBLISHED" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "LESSON_PUBLISHED",
    resourceType: "Lesson",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/learning/lessons/${id}`);
  revalidatePath("/dashboard/admin/learning/lessons");
}

export async function archiveLesson(formData: FormData) {
  const session = await requireActionPermission("lessons.edit");
  const id = formData.get("id") as string;
  await prisma.lesson.update({ where: { id }, data: { moderationStatus: "SUSPENDED" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "LESSON_ARCHIVED",
    resourceType: "Lesson",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/learning/lessons/${id}`);
  revalidatePath("/dashboard/admin/learning/lessons");
}

export async function restoreLesson(formData: FormData) {
  const session = await requireActionPermission("lessons.edit");
  const id = formData.get("id") as string;
  await prisma.lesson.update({ where: { id }, data: { moderationStatus: "DRAFT" } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "LESSON_RESTORED",
    resourceType: "Lesson",
    resourceId: id,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/learning/lessons/${id}`);
  revalidatePath("/dashboard/admin/learning/lessons");
}

export async function bulkApproveLessons(rawIds: string[]): Promise<BulkResult> {
  const session = await requireActionPermission("lessons.approve");
  const ids = Array.from(new Set(rawIds));
  if (ids.length === 0) return { updatedCount: 0, failed: [] };

  const { failed, eligibleIds } = await prisma.$transaction(async (tx) => {
    const found = await tx.lesson.findMany({
      where: { id: { in: ids } },
      select: { id: true, moderationStatus: true },
    });
    const foundById = new Map(found.map((l) => [l.id, l]));

    const failed: { id: string; reason: string }[] = [];
    const eligibleIds: string[] = [];

    for (const id of ids) {
      const lesson = foundById.get(id);
      if (!lesson) failed.push({ id, reason: "Not found" });
      else if (!APPROVABLE_STATUSES.includes(lesson.moderationStatus as (typeof APPROVABLE_STATUSES)[number]))
        failed.push({ id, reason: `Not eligible — currently ${lesson.moderationStatus}` });
      else eligibleIds.push(id);
    }

    if (eligibleIds.length > 0) {
      await tx.lesson.updateMany({
        where: { id: { in: eligibleIds } },
        data: { moderationStatus: "APPROVED", moderatedById: session.user.id, moderatedAt: new Date() },
      });
    }

    return { failed, eligibleIds };
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "LESSONS_BULK_APPROVED",
    resourceType: "Lesson",
    result: "SUCCESS",
    after: { updatedIds: eligibleIds, failedIds: failed.map((f) => f.id) },
  });

  revalidatePath("/dashboard/admin/learning/lessons");
  return { updatedCount: eligibleIds.length, failed };
}

export async function bulkPublishLessons(ids: string[]): Promise<BulkResult> {
  const session = await requireActionPermission("lessons.publish");
  if (ids.length === 0) return { updatedCount: 0, failed: [] };

  const found = await prisma.lesson.findMany({
    where: { id: { in: ids } },
    select: { id: true, moderationStatus: true },
  });
  const foundById = new Map(found.map((l) => [l.id, l]));

  const failed: { id: string; reason: string }[] = [];
  const eligibleIds: string[] = [];

  for (const id of ids) {
    const lesson = foundById.get(id);
    if (!lesson) failed.push({ id, reason: "Not found" });
    else if (lesson.moderationStatus !== "APPROVED")
      failed.push({ id, reason: `Not approved (currently ${lesson.moderationStatus})` });
    else eligibleIds.push(id);
  }

  if (eligibleIds.length > 0) {
    await prisma.lesson.updateMany({ where: { id: { in: eligibleIds } }, data: { moderationStatus: "PUBLISHED" } });
  }

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "LESSONS_BULK_PUBLISHED",
    resourceType: "Lesson",
    result: "SUCCESS",
    after: { updatedIds: eligibleIds, failedIds: failed.map((f) => f.id) },
  });

  revalidatePath("/dashboard/admin/learning/lessons");
  return { updatedCount: eligibleIds.length, failed };
}
