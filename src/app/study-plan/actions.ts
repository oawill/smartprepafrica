"use server";

import { revalidatePath } from "next/cache";
import type { ExamType, StudyDayOfWeek } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudentSession } from "@/lib/exam-access";
import {
  recordActivityCompletion,
  resolveMissedItem,
  rescheduleItem,
  regenerateStudyPlan,
  saveStudyPreferences,
  updateStudyPlanSubjects,
  addCustomSession,
  startOfDay,
} from "@/lib/study-plan/regenerate";

export async function markStudyPlanItemComplete(formData: FormData) {
  const session = await requireStudentSession("/study-plan");
  const itemId = formData.get("itemId") as string;
  await recordActivityCompletion(session.user.id, itemId);
  revalidatePath("/study-plan");
  revalidatePath("/dashboard/student");
  revalidatePath("/study/today");
}

const missedActions = ["DO_TODAY", "MOVE_TOMORROW", "SKIP"] as const;

export async function resolveMissedStudyPlanItem(formData: FormData) {
  const session = await requireStudentSession("/study-plan");
  const itemId = formData.get("itemId") as string;
  const action = formData.get("action") as string;

  if ((missedActions as readonly string[]).includes(action)) {
    await resolveMissedItem(session.user.id, itemId, action as (typeof missedActions)[number]);
  } else if (action === "RESCHEDULE") {
    const dateStr = formData.get("date") as string;
    if (dateStr) await resolveMissedItem(session.user.id, itemId, { type: "RESCHEDULE", date: new Date(dateStr) });
  }
  revalidatePath("/study-plan");
  revalidatePath("/dashboard/student");
  revalidatePath("/study/today");
}

export async function rescheduleStudyPlanItem(formData: FormData) {
  const session = await requireStudentSession("/study-plan");
  const itemId = formData.get("itemId") as string;
  const dateStr = formData.get("date") as string;
  if (!dateStr) return;
  await rescheduleItem(session.user.id, itemId, new Date(dateStr));
  revalidatePath("/study-plan");
  revalidatePath("/dashboard/student");
  revalidatePath("/study/today");
}

/** force: true, so this is the one place a click can't be accidentally
 * cheap-skipped by the fingerprint check — the student explicitly asked
 * for a fresh plan. Still can't create duplicate rows: the diff-and-merge
 * strategy inside regenerateStudyPlan only ever touches PENDING rows by
 * natural key. */
export async function regenerateMyStudyPlan() {
  const session = await requireStudentSession("/study-plan");
  await regenerateStudyPlan(session.user.id, { reason: "MANUAL", force: true });
  revalidatePath("/study-plan");
  revalidatePath("/dashboard/student");
  revalidatePath("/study/today");
}

export async function togglePauseStudyPlan(formData: FormData) {
  const session = await requireStudentSession("/study-plan");
  const weekStartStr = formData.get("weekStart") as string;
  const pause = formData.get("pause") === "true";
  const plan = await prisma.studyPlan.findUnique({
    where: { userId_weekStart: { userId: session.user.id, weekStart: new Date(weekStartStr) } },
    select: { id: true },
  });
  if (plan) {
    await prisma.studyPlan.update({ where: { id: plan.id }, data: { status: pause ? "PAUSED" : "ACTIVE" } });
  }
  revalidatePath("/study-plan");
  revalidatePath("/dashboard/student");
}

const studyDayValues = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
const studyPeriodValues = ["MORNING", "AFTERNOON", "EVENING", "NO_PREFERENCE"] as const;

export async function saveStudyPreferencesAction(formData: FormData) {
  const session = await requireStudentSession("/study-plan");

  const minutesChoice = formData.get("dailyStudyMinutes") as string;
  const customMinutes = Number(formData.get("customMinutes"));
  const dailyStudyMinutes =
    minutesChoice === "custom" ? (customMinutes > 0 ? Math.round(customMinutes) : null) : Number(minutesChoice) || null;
  if (!dailyStudyMinutes) return;

  const selectedDays = formData
    .getAll("studyDays")
    .map(String)
    .filter((d): d is StudyDayOfWeek => (studyDayValues as readonly string[]).includes(d));

  const periodChoice = formData.get("preferredStudyPeriod") as string;
  const preferredStudyPeriod = (studyPeriodValues as readonly string[]).includes(periodChoice) ? periodChoice : null;

  await saveStudyPreferences(session.user.id, { dailyStudyMinutes, studyDays: selectedDays, preferredStudyPeriod });
  revalidatePath("/study-plan");
  revalidatePath("/dashboard/student");
}

export async function updateStudyPlanSubjectsAction(formData: FormData) {
  const session = await requireStudentSession("/study-plan");
  const subjectIds = formData.getAll("subjectIds").map(String);
  await updateStudyPlanSubjects(session.user.id, subjectIds);
  revalidatePath("/study-plan");
  revalidatePath("/dashboard/student");
}

export async function addCustomSessionAction(formData: FormData) {
  const session = await requireStudentSession("/study-plan");
  const subjectId = formData.get("subjectId") as string;
  const topic = (formData.get("topic") as string)?.trim();
  const minutes = Number(formData.get("minutes"));
  const dateStr = formData.get("date") as string;
  if (!subjectId || !topic || !minutes || !dateStr) return;

  await addCustomSession(session.user.id, { subjectId, topic, minutes: Math.round(minutes), date: new Date(dateStr) });
  revalidatePath("/study-plan");
}

const examTypeValues = ["WAEC", "NECO", "UTME", "POST_UTME"] as const;

export async function setExamDateAction(formData: FormData) {
  const session = await requireStudentSession("/study-plan");
  const exam = formData.get("exam") as string;
  const dateStr = formData.get("examDate") as string;
  if (!(examTypeValues as readonly string[]).includes(exam)) return;

  await prisma.studentExamProfile.upsert({
    where: { userId_exam: { userId: session.user.id, exam: exam as ExamType } },
    update: { examDate: dateStr ? startOfDay(new Date(dateStr)) : null },
    create: { userId: session.user.id, exam: exam as ExamType, examDate: dateStr ? startOfDay(new Date(dateStr)) : null },
  });
  await regenerateStudyPlan(session.user.id, { reason: "PROFILE_CHANGED" });
  revalidatePath("/study-plan");
}
