"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";

const priorities = ["HIGH", "MEDIUM", "LOW"] as const;

export async function createTask(formData: FormData) {
  const session = await requireActionPermission("funding_center.manage");
  const task = formData.get("task") as string;
  if (!task?.trim()) return;

  const opportunityId = (formData.get("opportunityId") as string) || undefined;
  const dueDateRaw = formData.get("dueDate") as string;

  await prisma.educationAccessTask.create({
    data: {
      task: task.trim(),
      opportunityId,
      ownerId: session.user.id,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : undefined,
      priority: (formData.get("priority") as (typeof priorities)[number]) || "MEDIUM",
      notes: (formData.get("notes") as string) || undefined,
    },
  });

  if (opportunityId) {
    revalidatePath(`/dashboard/admin/education-access/funding-center/opportunities/${opportunityId}`);
  }
  revalidatePath("/dashboard/admin/education-access/funding-center/tasks");
  revalidatePath("/dashboard/admin/education-access/funding-center");
}

export async function updateTaskStatus(formData: FormData) {
  await requireActionPermission("funding_center.manage");
  const taskId = formData.get("taskId") as string;
  const status = formData.get("status") as string;

  const task = await prisma.educationAccessTask.update({
    where: { id: taskId },
    data: { status },
  });

  if (task.opportunityId) {
    revalidatePath(`/dashboard/admin/education-access/funding-center/opportunities/${task.opportunityId}`);
  }
  revalidatePath("/dashboard/admin/education-access/funding-center/tasks");
  revalidatePath("/dashboard/admin/education-access/funding-center");
}
