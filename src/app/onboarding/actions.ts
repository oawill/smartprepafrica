"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AcademicTrack, StudyDayOfWeek, StudyPeriod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudentSession } from "@/lib/exam-access";
import { EXAM_CODE_TO_EXAM_TYPE } from "@/lib/exam-type-mapping";
import { regenerateStudyPlan } from "@/lib/study-plan/regenerate";

export async function saveClassLevel(formData: FormData) {
  const session = await requireStudentSession("/onboarding");
  const gradeLevel = (formData.get("gradeLevel") as string)?.trim();
  if (!gradeLevel) return;

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: { gradeLevel },
  });

  revalidatePath("/onboarding");
  redirect("/onboarding?step=track");
}

const academicTracks = ["SCIENCE", "ARTS", "COMMERCIAL", "UNDECIDED"] as const;

export async function saveAcademicTrack(formData: FormData) {
  const session = await requireStudentSession("/onboarding");
  const academicTrack = formData.get("academicTrack") as (typeof academicTracks)[number];
  if (!academicTracks.includes(academicTrack)) return;

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: { academicTrack: academicTrack as AcademicTrack },
  });

  revalidatePath("/onboarding");
  redirect("/onboarding?step=subjects");
}

export async function saveSubjects(formData: FormData) {
  const session = await requireStudentSession("/onboarding");
  const subjectIds = formData.getAll("subjectIds").map(String);

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: { targetSubjects: { set: subjectIds.map((id) => ({ id })) } },
  });

  revalidatePath("/onboarding");
  redirect("/onboarding?step=exams");
}

export async function saveTargetExams(formData: FormData) {
  const session = await requireStudentSession("/onboarding");
  const examCodes = formData.getAll("examCodes").map(String);
  const targetExams = examCodes.map((code) => EXAM_CODE_TO_EXAM_TYPE[code]).filter(Boolean);

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: { targetExams: { set: targetExams } },
  });

  revalidatePath("/onboarding");
  redirect("/onboarding?step=weak-subjects");
}

export async function saveWeakSubjects(formData: FormData) {
  const session = await requireStudentSession("/onboarding");
  const weakSubjectIds = formData.getAll("weakSubjectIds").map(String);

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: { weakSubjects: { set: weakSubjectIds.map((id) => ({ id })) } },
  });

  revalidatePath("/onboarding");
  redirect("/onboarding?step=goal");
}

const studyGoalPresets = [
  "Pass my exams",
  "Improve my grades",
  "Prepare for university admission",
  "General learning",
] as const;

export async function saveStudyGoal(formData: FormData) {
  const session = await requireStudentSession("/onboarding");
  const preset = formData.get("studyGoalPreset") as string;
  const custom = (formData.get("studyGoalCustom") as string)?.trim();
  const studyGoal = custom || (studyGoalPresets.includes(preset as never) ? preset : null);

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: { studyGoal },
  });

  revalidatePath("/onboarding");
  redirect("/onboarding?step=availability");
}

const studyDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
const studyPeriods = ["MORNING", "AFTERNOON", "EVENING", "NO_PREFERENCE"] as const;

export async function completeOnboarding(formData: FormData) {
  const session = await requireStudentSession("/onboarding");

  const minutesChoice = formData.get("dailyStudyMinutes") as string;
  const customMinutes = Number(formData.get("customMinutes"));
  const dailyStudyMinutes =
    minutesChoice === "custom" ? (customMinutes > 0 ? Math.round(customMinutes) : null) : Number(minutesChoice) || null;

  const selectedDays = formData
    .getAll("studyDays")
    .map(String)
    .filter((d): d is StudyDayOfWeek => (studyDays as readonly string[]).includes(d));

  const periodChoice = formData.get("preferredStudyPeriod") as string;
  const preferredStudyPeriod = (studyPeriods as readonly string[]).includes(periodChoice)
    ? (periodChoice as StudyPeriod)
    : null;

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: {
      dailyStudyMinutes,
      studyDays: { set: selectedDays },
      preferredStudyPeriod,
      onboardingCompleted: true,
    },
  });

  if (dailyStudyMinutes && selectedDays.length > 0) {
    await regenerateStudyPlan(session.user.id, { reason: "ONBOARDING_COMPLETED" });
  }

  revalidatePath("/dashboard/student");
  redirect("/dashboard?onboarded=1");
}

// Ensures a StudentProfile row exists before the wizard's first step reads
// it (registration already creates one for STUDENT signups, but this
// guards any edge case — e.g. a role changed after the fact — without
// ever failing the page).
export async function ensureStudentProfile(userId: string) {
  await prisma.studentProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { id: true },
  });
}
