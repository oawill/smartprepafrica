import type { ExamType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  classifyMastery,
  recordExamTopicAttempt,
  recordExamTopicAttempts,
} from "@/lib/practice/readiness-service";

export type PrepDrillSuggestion = { exam: ExamType; subjectId: string; topic: string };

/** After a Learning quiz/checkpoint answer, checks whether this exact
 * (subjectId, topic) also appears in the Question bank for one of the
 * student's target exams. If so, dual-writes into StudentExamTopicMastery
 * (via the same recordExamTopicAttempt EMA used everywhere in Prep) so
 * Prep's own drills/readiness immediately reflect this Learning attempt,
 * then returns a drill suggestion if the resulting status is WEAK/REVIEW
 * for any matched exam. Returns null when there's nothing to suggest —
 * no target exams, no matching question bank topic, or mastery is fine. */
export async function recordCrossoverAttempts(params: {
  userId: string;
  subjectId: string;
  topic: string;
  results: { isCorrect: boolean }[];
}): Promise<PrepDrillSuggestion | null> {
  const { userId, subjectId, topic, results } = params;
  if (results.length === 0) return null;

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { targetExams: true },
  });
  if (!studentProfile || studentProfile.targetExams.length === 0) return null;
  const targetExams = studentProfile.targetExams;

  const matches = await prisma.question.findMany({
    where: { subjectId, topic, exam: { in: targetExams } },
    select: { exam: true },
    distinct: ["exam"],
  });
  if (matches.length === 0) return null;
  const matchedExams = matches.map((m) => m.exam);

  for (const exam of matchedExams) {
    if (results.length === 1) {
      await recordExamTopicAttempt({ userId, exam, subjectId, topic, isCorrect: results[0].isCorrect });
    } else {
      await recordExamTopicAttempts(
        userId,
        exam,
        results.map((r) => ({ subjectId, topic, isCorrect: r.isCorrect }))
      );
    }
  }

  const masteryRows = await prisma.studentExamTopicMastery.findMany({
    where: { userId, subjectId, topic, exam: { in: matchedExams } },
  });
  const weak = masteryRows.find((r) => {
    const status = classifyMastery(r.masteryScore, r.confidenceScore);
    return status === "WEAK" || status === "REVIEW";
  });
  if (!weak) return null;

  return { exam: weak.exam, subjectId, topic };
}

/** Read-only counterpart used to decide whether to render the CTA on a
 * server-rendered page (e.g. after a quiz submission's revalidate), where
 * the mutation already happened inside the form action and there's no
 * return value to thread through. */
export async function findExistingCrossoverSuggestion(params: {
  userId: string;
  subjectId: string;
  topic: string;
}): Promise<PrepDrillSuggestion | null> {
  const { userId, subjectId, topic } = params;

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { targetExams: true },
  });
  if (!studentProfile || studentProfile.targetExams.length === 0) return null;

  const masteryRows = await prisma.studentExamTopicMastery.findMany({
    where: { userId, subjectId, topic, exam: { in: studentProfile.targetExams } },
  });
  const weak = masteryRows.find((r) => {
    const status = classifyMastery(r.masteryScore, r.confidenceScore);
    return status === "WEAK" || status === "REVIEW";
  });
  if (!weak) return null;

  return { exam: weak.exam, subjectId, topic };
}
