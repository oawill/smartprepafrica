"use server";

import { revalidatePath } from "next/cache";
import type { ExamType } from "@prisma/client";
import { requireActionPermission } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

function positiveInt(formData: FormData, field: string): number {
  const value = Number(formData.get(field));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Enter a valid, positive value for ${field}.`);
  }
  return Math.round(value);
}

export async function updateExamDrillConfig(formData: FormData) {
  await requireActionPermission("readiness.manage");

  const exam = formData.get("exam") as ExamType;
  const data = {
    quickCheckSize: positiveInt(formData, "quickCheckSize"),
    topicDrillSize: positiveInt(formData, "topicDrillSize"),
    practiceSessionSize: positiveInt(formData, "practiceSessionSize"),
    challengeSize: positiveInt(formData, "challengeSize"),
    fullMockSubjectCount: positiveInt(formData, "fullMockSubjectCount"),
    fullMockQuestionsPerSubject: positiveInt(formData, "fullMockQuestionsPerSubject"),
    fullMockTimeLimitMinutes: positiveInt(formData, "fullMockTimeLimitMinutes"),
    minTopicsForReadiness: positiveInt(formData, "minTopicsForReadiness"),
  };

  await prisma.examDrillConfig.upsert({
    where: { exam },
    update: data,
    create: { exam, ...data },
  });

  revalidatePath("/dashboard/admin/readiness/settings");
}
