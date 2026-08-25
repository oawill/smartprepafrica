"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

const curriculumFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  code: z.string().trim().min(1, "Code is required."),
  country: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

export async function createCurriculum(formData: FormData) {
  const session = await requireActionPermission("curriculum.manage");
  const fields = curriculumFieldsSchema.parse({
    name: formData.get("name"),
    code: (formData.get("code") as string)?.toUpperCase(),
    country: formData.get("country") || "Nigeria",
    description: (formData.get("description") as string) || undefined,
  });

  const curriculum = await prisma.curriculum.create({ data: fields });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "CURRICULUM_CREATED",
    resourceType: "Curriculum",
    resourceId: curriculum.id,
    result: "SUCCESS",
    after: { name: fields.name, code: fields.code },
  });

  revalidatePath("/dashboard/admin/learning/curriculum");
  redirect(`/dashboard/admin/learning/curriculum/${curriculum.id}`);
}

export async function toggleCurriculumActive(formData: FormData) {
  const session = await requireActionPermission("curriculum.manage");
  const id = formData.get("id") as string;
  const curriculum = await prisma.curriculum.findUniqueOrThrow({ where: { id } });

  await prisma.curriculum.update({ where: { id }, data: { isActive: !curriculum.isActive } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "CURRICULUM_ACTIVE_TOGGLED",
    resourceType: "Curriculum",
    resourceId: id,
    result: "SUCCESS",
    after: { isActive: !curriculum.isActive },
  });
  revalidatePath("/dashboard/admin/learning/curriculum");
  revalidatePath(`/dashboard/admin/learning/curriculum/${id}`);
}

const classLevelFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  code: z.string().trim().optional(),
});

export async function createClassLevel(formData: FormData) {
  const session = await requireActionPermission("curriculum.manage");
  const curriculumId = formData.get("curriculumId") as string;
  const fields = classLevelFieldsSchema.parse({
    name: formData.get("name"),
    code: (formData.get("code") as string) || undefined,
  });

  const count = await prisma.classLevel.count({ where: { curriculumId } });
  const classLevel = await prisma.classLevel.create({
    data: { ...fields, curriculumId, order: count },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "CLASS_LEVEL_CREATED",
    resourceType: "ClassLevel",
    resourceId: classLevel.id,
    result: "SUCCESS",
    after: { name: fields.name, curriculumId },
  });

  revalidatePath(`/dashboard/admin/learning/curriculum/${curriculumId}`);
}

export async function toggleClassLevelActive(formData: FormData) {
  const session = await requireActionPermission("curriculum.manage");
  const id = formData.get("id") as string;
  const curriculumId = formData.get("curriculumId") as string;
  const classLevel = await prisma.classLevel.findUniqueOrThrow({ where: { id } });

  await prisma.classLevel.update({ where: { id }, data: { isActive: !classLevel.isActive } });
  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "CLASS_LEVEL_ACTIVE_TOGGLED",
    resourceType: "ClassLevel",
    resourceId: id,
    result: "SUCCESS",
    after: { isActive: !classLevel.isActive },
  });
  revalidatePath(`/dashboard/admin/learning/curriculum/${curriculumId}`);
}

/** Swaps a class level's order with its immediate neighbor, inside a
 * transaction so a concurrent reorder can't produce a duplicate order
 * value — same pattern as reorderPassageQuestion. */
export async function reorderClassLevel(formData: FormData) {
  const session = await requireActionPermission("curriculum.manage");
  const id = formData.get("id") as string;
  const curriculumId = formData.get("curriculumId") as string;
  const direction = formData.get("direction") as "up" | "down";

  await prisma.$transaction(async (tx) => {
    const levels = await tx.classLevel.findMany({
      where: { curriculumId },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });
    const i = levels.findIndex((l) => l.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= levels.length) return;

    await tx.classLevel.update({ where: { id: levels[i].id }, data: { order: levels[j].order } });
    await tx.classLevel.update({ where: { id: levels[j].id }, data: { order: levels[i].order } });
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "CLASS_LEVELS_REORDERED",
    resourceType: "Curriculum",
    resourceId: curriculumId,
    result: "SUCCESS",
  });

  revalidatePath(`/dashboard/admin/learning/curriculum/${curriculumId}`);
}
