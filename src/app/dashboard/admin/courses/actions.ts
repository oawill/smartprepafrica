"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

async function recordModeration(
  actorId: string,
  actorRole: import("@prisma/client").Role,
  courseId: string,
  action: string,
  data: Record<string, unknown>
) {
  await logAudit({
    actorUserId: actorId,
    actorRole,
    action,
    resourceType: "Course",
    resourceId: courseId,
    result: "SUCCESS",
    after: data,
  });
}

export async function approveCourse(formData: FormData) {
  const session = await requireActionPermission("courses.approve");
  const courseId = formData.get("courseId") as string;

  await prisma.course.update({
    where: { id: courseId },
    data: {
      moderationStatus: "APPROVED",
      published: true,
      moderationReason: null,
      moderatedById: session.user.id,
      moderatedAt: new Date(),
    },
  });
  await recordModeration(session.user.id, session.user.role, courseId, "COURSE_APPROVED", {});
  revalidatePath("/dashboard/admin/courses");
}

export async function rejectCourse(formData: FormData) {
  const session = await requireActionPermission("courses.approve");
  const courseId = formData.get("courseId") as string;
  const reason = ((formData.get("reason") as string) || "").trim();
  if (!reason) throw new Error("A reason is required when rejecting a course.");

  await prisma.course.update({
    where: { id: courseId },
    data: {
      moderationStatus: "REJECTED",
      published: false,
      moderationReason: reason,
      moderatedById: session.user.id,
      moderatedAt: new Date(),
    },
  });
  await recordModeration(session.user.id, session.user.role, courseId, "COURSE_REJECTED", { reason });
  revalidatePath("/dashboard/admin/courses");
}

export async function suspendCourse(formData: FormData) {
  const session = await requireActionPermission("courses.approve");
  const courseId = formData.get("courseId") as string;
  const reason = ((formData.get("reason") as string) || "").trim();
  if (!reason) throw new Error("A reason is required when suspending a course.");

  await prisma.course.update({
    where: { id: courseId },
    data: {
      moderationStatus: "SUSPENDED",
      published: false,
      moderationReason: reason,
      moderatedById: session.user.id,
      moderatedAt: new Date(),
    },
  });
  await recordModeration(session.user.id, session.user.role, courseId, "COURSE_SUSPENDED", { reason });
  revalidatePath("/dashboard/admin/courses");
}

export async function toggleFeatured(formData: FormData) {
  const session = await requireActionPermission("courses.approve");
  const courseId = formData.get("courseId") as string;
  const course = await prisma.course.findUniqueOrThrow({ where: { id: courseId } });

  await prisma.course.update({ where: { id: courseId }, data: { featured: !course.featured } });
  await recordModeration(session.user.id, session.user.role, courseId, "COURSE_FEATURED_TOGGLED", {
    featured: !course.featured,
  });
  revalidatePath("/dashboard/admin/courses");
}
