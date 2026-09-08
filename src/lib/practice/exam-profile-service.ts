import type { ExamType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** English Language is the one real, well-known compulsory UTME/JAMB
 * subject — deliberately not a generic "core subjects" system, since no
 * such rule exists anywhere else in the codebase for WAEC/NECO/Post-UTME
 * today. */
export function getCompulsorySubjectNames(exam: ExamType): string[] {
  return exam === "UTME" ? ["English Language"] : [];
}

export async function getExamProfile(userId: string, exam: ExamType) {
  return prisma.studentExamProfile.findUnique({
    where: { userId_exam: { userId, exam } },
    include: { subjects: { select: { id: true, name: true } } },
  });
}

export async function hasExamProfile(userId: string, exam: ExamType): Promise<boolean> {
  const count = await prisma.studentExamProfile.count({ where: { userId, exam } });
  return count > 0;
}

/** Full-replace membership — only changes which subjects are in scope for
 * readiness/drills. Never touches ExamAttempt/QuestionResponse/
 * StudentExamTopicMastery rows, so removing then re-adding a subject later
 * restores its full history exactly as-is. */
export async function saveExamProfile(userId: string, exam: ExamType, subjectIds: string[]) {
  await prisma.studentExamProfile.upsert({
    where: { userId_exam: { userId, exam } },
    update: { subjects: { set: subjectIds.map((id) => ({ id })) } },
    create: { userId, exam, subjects: { connect: subjectIds.map((id) => ({ id })) } },
  });
}

/** For the item-14 existing-student flow: subjects this student has
 * actually attempted under this exam, used to pre-populate (never
 * auto-save) a confirm screen instead of blank onboarding. */
export async function suggestSubjectsFromHistory(
  userId: string,
  exam: ExamType
): Promise<{ id: string; name: string }[]> {
  return prisma.subject.findMany({
    where: { examAttempts: { some: { exam, userId } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
