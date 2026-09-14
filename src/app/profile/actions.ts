"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AcademicTrack } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudentSession } from "@/lib/exam-access";
import { EXAM_CODE_TO_EXAM_TYPE } from "@/lib/exam-type-mapping";
import { regenerateStudyPlan, saveStudyPreferences, updateStudyPlanSubjects } from "@/lib/study-plan/regenerate";

/** Every action below writes only to `where: { userId: session.user.id }`
 * — the id always comes from the server-verified session, never from
 * client input — which is what actually prevents one student from
 * modifying another's profile (no separate "ownership check" needed on
 * top of this, matching the pattern already used by every onboarding/
 * study-plan action). */

export async function updateName(formData: FormData) {
  const session = await requireStudentSession("/profile");
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  await prisma.user.update({ where: { id: session.user.id }, data: { name } });

  revalidatePath("/profile");
  redirect("/profile?updated=personal");
}

export async function updateClassLevel(formData: FormData) {
  const session = await requireStudentSession("/profile");
  const gradeLevel = (formData.get("gradeLevel") as string)?.trim();
  if (!gradeLevel) return;

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: { gradeLevel },
  });

  revalidatePath("/profile");
  redirect("/profile?updated=personal");
}

const academicTracks = ["SCIENCE", "ARTS", "COMMERCIAL", "UNDECIDED"] as const;

/** Deliberately never touches targetSubjects — a track change only ever
 * offers to review subjects (via the trackChanged banner on the profile
 * page), it never silently removes any. */
export async function updateAcademicTrack(formData: FormData) {
  const session = await requireStudentSession("/profile");
  const academicTrack = formData.get("academicTrack") as (typeof academicTracks)[number];
  if (!academicTracks.includes(academicTrack)) return;

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: { academicTrack: academicTrack as AcademicTrack },
  });
  await regenerateStudyPlan(session.user.id, { reason: "PROFILE_CHANGED" });

  revalidatePath("/profile");
  redirect("/profile?updated=track&trackChanged=1");
}

export async function updateSubjects(formData: FormData) {
  const session = await requireStudentSession("/profile");
  const subjectIds = formData.getAll("subjectIds").map(String);

  await updateStudyPlanSubjects(session.user.id, subjectIds);

  revalidatePath("/profile");
  redirect("/profile?updated=subjects");
}

export async function updateTargetExams(formData: FormData) {
  const session = await requireStudentSession("/profile");
  const examCodes = formData.getAll("examCodes").map(String);
  const targetExams = examCodes.map((code) => EXAM_CODE_TO_EXAM_TYPE[code]).filter(Boolean);

  // Only the StudentProfile.targetExams array changes here — ExamAttempt,
  // StudentTopicMastery, StudentExamTopicMastery and StudentExamProfile
  // rows are never touched, so historical performance and any saved exam
  // date survive a target-exam removal intact.
  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: { targetExams: { set: targetExams } },
  });
  await regenerateStudyPlan(session.user.id, { reason: "PROFILE_CHANGED" });

  revalidatePath("/profile");
  redirect("/profile?updated=exams");
}

/** Student-selected focus areas only — never writes to StudentTopicMastery
 * (the system-detected signal), so the two stay independent per brief §6. */
export async function updateWeakSubjects(formData: FormData) {
  const session = await requireStudentSession("/profile");
  const weakSubjectIds = formData.getAll("weakSubjectIds").map(String);

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: { weakSubjects: { set: weakSubjectIds.map((id) => ({ id })) } },
  });
  await regenerateStudyPlan(session.user.id, { reason: "PROFILE_CHANGED" });

  revalidatePath("/profile");
  redirect("/profile?updated=weak-subjects");
}

const studyGoalPresets = [
  "Pass my exams",
  "Improve my grades",
  "Prepare for university admission",
  "General learning",
] as const;

export async function updateStudyGoal(formData: FormData) {
  const session = await requireStudentSession("/profile");
  const preset = formData.get("studyGoalPreset") as string;
  const custom = (formData.get("studyGoalCustom") as string)?.trim();
  const studyGoal = custom || (studyGoalPresets.includes(preset as never) ? preset : null);

  await prisma.studentProfile.update({
    where: { userId: session.user.id },
    data: { studyGoal },
  });

  revalidatePath("/profile");
  redirect("/profile?updated=goal");
}

const studyDayValues = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
const studyPeriodValues = ["MORNING", "AFTERNOON", "EVENING", "NO_PREFERENCE"] as const;

/** Thin wrapper around the Study Plan phase's saveStudyPreferences, which
 * already regenerates via regenerateStudyPlan's existing mid-week-safe
 * logic (protects completed/in-progress items, only recomputes future
 * PENDING days) — brief §10's scenario is handled by that existing code,
 * nothing new needed here. */
export async function updateStudyPreferencesAction(formData: FormData) {
  const session = await requireStudentSession("/profile");

  const minutesChoice = formData.get("dailyStudyMinutes") as string;
  const customMinutes = Number(formData.get("customMinutes"));
  const dailyStudyMinutes =
    minutesChoice === "custom" ? (customMinutes > 0 ? Math.round(customMinutes) : null) : Number(minutesChoice) || null;
  if (!dailyStudyMinutes) return;

  const selectedDays = formData
    .getAll("studyDays")
    .map(String)
    .filter((d): d is (typeof studyDayValues)[number] => (studyDayValues as readonly string[]).includes(d));

  const periodChoice = formData.get("preferredStudyPeriod") as string;
  const preferredStudyPeriod = (studyPeriodValues as readonly string[]).includes(periodChoice) ? periodChoice : null;

  await saveStudyPreferences(session.user.id, { dailyStudyMinutes, studyDays: selectedDays, preferredStudyPeriod });

  revalidatePath("/profile");
  redirect("/profile?updated=preferences");
}
