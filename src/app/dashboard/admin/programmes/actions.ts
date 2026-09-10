"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

const programmeFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().optional(),
  coverImageUrl: z.string().trim().optional(),
});

export async function createProgramme(formData: FormData) {
  const session = await requireActionPermission("programmes.manage");
  const fields = programmeFieldsSchema.parse({
    title: formData.get("title"),
    description: (formData.get("description") as string) || undefined,
    coverImageUrl: (formData.get("coverImageUrl") as string) || undefined,
  });

  const programme = await prisma.programme.create({ data: fields });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PROGRAMME_CREATED",
    resourceType: "Programme",
    resourceId: programme.id,
    result: "SUCCESS",
    after: { title: fields.title },
  });

  revalidatePath("/dashboard/admin/programmes");
  redirect(`/dashboard/admin/programmes/${programme.id}`);
}

export async function toggleProgrammePublished(formData: FormData) {
  const session = await requireActionPermission("programmes.manage");
  const id = formData.get("id") as string;
  const programme = await prisma.programme.findUniqueOrThrow({ where: { id } });

  await prisma.programme.update({ where: { id }, data: { published: !programme.published } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PROGRAMME_PUBLISHED_TOGGLED",
    resourceType: "Programme",
    resourceId: id,
    result: "SUCCESS",
    after: { published: !programme.published },
  });
  revalidatePath("/dashboard/admin/programmes");
  revalidatePath(`/dashboard/admin/programmes/${id}`);
}

export async function addProgrammeCourse(formData: FormData) {
  const session = await requireActionPermission("programmes.manage");
  const programmeId = formData.get("programmeId") as string;
  const courseId = formData.get("courseId") as string;
  if (!courseId) throw new Error("Choose a course to add.");

  const count = await prisma.programmeCourse.count({ where: { programmeId } });
  await prisma.programmeCourse.upsert({
    where: { programmeId_courseId: { programmeId, courseId } },
    update: {},
    create: { programmeId, courseId, order: count },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PROGRAMME_COURSE_ADDED",
    resourceType: "Programme",
    resourceId: programmeId,
    result: "SUCCESS",
    after: { courseId },
  });
  revalidatePath(`/dashboard/admin/programmes/${programmeId}`);
}

export async function removeProgrammeCourse(formData: FormData) {
  const session = await requireActionPermission("programmes.manage");
  const programmeId = formData.get("programmeId") as string;
  const courseId = formData.get("courseId") as string;

  await prisma.programmeCourse.delete({
    where: { programmeId_courseId: { programmeId, courseId } },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PROGRAMME_COURSE_REMOVED",
    resourceType: "Programme",
    resourceId: programmeId,
    result: "SUCCESS",
    after: { courseId },
  });
  revalidatePath(`/dashboard/admin/programmes/${programmeId}`);
}

/** Swaps a member course's order with its immediate neighbor, inside a
 * transaction so a concurrent reorder can't produce a duplicate order
 * value — same pattern as reorderClassLevel. */
export async function reorderProgrammeCourse(formData: FormData) {
  const session = await requireActionPermission("programmes.manage");
  const programmeId = formData.get("programmeId") as string;
  const courseId = formData.get("courseId") as string;
  const direction = formData.get("direction") as "up" | "down";

  await prisma.$transaction(async (tx) => {
    const members = await tx.programmeCourse.findMany({
      where: { programmeId },
      orderBy: { order: "asc" },
      select: { courseId: true, order: true },
    });
    const i = members.findIndex((m) => m.courseId === courseId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= members.length) return;

    await tx.programmeCourse.update({
      where: { programmeId_courseId: { programmeId, courseId: members[i].courseId } },
      data: { order: members[j].order },
    });
    await tx.programmeCourse.update({
      where: { programmeId_courseId: { programmeId, courseId: members[j].courseId } },
      data: { order: members[i].order },
    });
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "PROGRAMME_COURSES_REORDERED",
    resourceType: "Programme",
    resourceId: programmeId,
    result: "SUCCESS",
  });
  revalidatePath(`/dashboard/admin/programmes/${programmeId}`);
}
