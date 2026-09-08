import type { ExamType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EXAM_TYPE_TO_EXAM_CODE } from "@/lib/exam-type-mapping";

/** Reads which subjects are compulsory for this exam from
 * CountryExamSubject.isCompulsory (e.g. Nigeria/UTME's English Language) —
 * data-driven instead of a hardcoded `exam === "UTME"` string check.
 *
 * Scoping note: this still only ever resolves NIGERIA's rule for the given
 * ExamType (via the legacy ExamType -> Exam.code bridge) — it does not
 * accept a countryId/countryExamId from caller context, because nothing
 * else in Prep (Question, ExamAttempt, StudentExamProfile, readiness,
 * drills) is country-scoped yet. This moves one hardcoded *rule* into data;
 * it does not make Prep itself country-aware. */
export async function getCompulsorySubjectNames(exam: ExamType): Promise<string[]> {
  const examCode = EXAM_TYPE_TO_EXAM_CODE[exam];
  const rows = await prisma.countryExamSubject.findMany({
    where: {
      isCompulsory: true,
      countryExam: { country: { code: "NG" }, exam: { code: examCode } },
    },
    select: { subject: { select: { name: true } } },
  });
  return rows.map((r) => r.subject.name);
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
