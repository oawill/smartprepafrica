"use server";

import { revalidatePath } from "next/cache";
import type { CountryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionPermission } from "@/lib/admin/authz";
import { logAudit } from "@/lib/admin/audit";

export async function createExamBody(formData: FormData) {
  const session = await requireActionPermission("exams.manage");

  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  if (!name || !code) throw new Error("Name and code are required.");

  const examBody = await prisma.examBody.create({ data: { name, code } });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "EXAM_BODY_CREATED",
    resourceType: "ExamBody",
    resourceId: examBody.id,
    result: "SUCCESS",
    after: { name, code },
  });
  revalidatePath("/dashboard/admin/exams");
}

export async function createExam(formData: FormData) {
  const session = await requireActionPermission("exams.manage");

  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const examBodyId = formData.get("examBodyId") as string;
  if (!name || !code || !examBodyId) throw new Error("Name, code, and exam body are required.");

  const exam = await prisma.exam.create({ data: { name, code, examBodyId } });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: "EXAM_CREATED",
    resourceType: "Exam",
    resourceId: exam.id,
    result: "SUCCESS",
    after: { name, code, examBodyId },
  });
  revalidatePath("/dashboard/admin/exams");
}

/** Creates the CountryExam row if it doesn't exist yet, or updates its
 * status if it does — this is the feature-flag control for activating an
 * exam in a new country. */
export async function setCountryExamStatus(formData: FormData) {
  const session = await requireActionPermission("exams.manage");

  const countryId = formData.get("countryId") as string;
  const examId = formData.get("examId") as string;
  const status = formData.get("status") as CountryStatus;
  if (!countryId || !examId || !status) throw new Error("Country, exam, and status are all required.");

  const before = await prisma.countryExam.findUnique({ where: { countryId_examId: { countryId, examId } } });
  const countryExam = await prisma.countryExam.upsert({
    where: { countryId_examId: { countryId, examId } },
    update: { status },
    create: { countryId, examId, status },
  });

  await logAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: before ? "COUNTRY_EXAM_STATUS_CHANGED" : "COUNTRY_EXAM_ACTIVATED",
    resourceType: "CountryExam",
    resourceId: countryExam.id,
    result: "SUCCESS",
    before: before ? { status: before.status } : null,
    after: { countryId, examId, status },
  });
  revalidatePath("/dashboard/admin/exams");
}
