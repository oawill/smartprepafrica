"use server";

import { redirect } from "next/navigation";
import type { ExamType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStudentSession } from "@/lib/exam-access";
import { getDrillConfig } from "@/lib/practice/exam-drill-config";
import { selectSmartQuestions, type DrillPurpose } from "@/lib/practice/smart-selection";

async function createDrillAttempt(params: {
  userId: string;
  exam: ExamType;
  subjectIds: string[];
  purpose: DrillPurpose;
  topic?: string;
  size: number;
}): Promise<string> {
  const questionIds = await selectSmartQuestions({
    userId: params.userId,
    exam: params.exam,
    subjectIds: params.subjectIds,
    purpose: params.purpose,
    topic: params.topic,
    size: params.size,
  });
  if (questionIds.length === 0) {
    throw new Error("No questions are available for that selection yet.");
  }

  // Same ExamAttempt/QuestionResponse shape src/app/practice/actions.ts's
  // startAttempt already creates — so the existing session runner, results
  // page, and submitAttempt grading/mastery pipeline all work unchanged.
  const attempt = await prisma.examAttempt.create({
    data: {
      userId: params.userId,
      exam: params.exam,
      mode: "STUDY_DRILL",
      totalItems: questionIds.length,
      subjects: { connect: params.subjectIds.map((id) => ({ id })) },
      responses: { create: questionIds.map((questionId, index) => ({ questionId, order: index })) },
    },
  });
  return attempt.id;
}

const PURPOSE_SIZE_KEY: Record<
  DrillPurpose,
  "quickCheckSize" | "topicDrillSize" | "practiceSessionSize" | "challengeSize"
> = {
  QUICK_CHECK: "quickCheckSize",
  TOPIC_DRILL: "topicDrillSize",
  PRACTICE_SESSION: "practiceSessionSize",
  CHALLENGE: "challengeSize",
};

/** Quick Check / Topic Drill / Practice Session / Challenge — the four
 * Quick Drill presets. Size is always resolved from the exam's
 * (admin-configurable) ExamDrillConfig, never a free-typed count. */
export async function startQuickDrill(formData: FormData) {
  const session = await requireStudentSession();
  const exam = formData.get("exam") as ExamType;
  const purpose = formData.get("purpose") as DrillPurpose;
  const subjectIds = formData.getAll("subjects") as string[];
  const topic = (formData.get("topic") as string) || undefined;

  if (subjectIds.length === 0) {
    throw new Error("Select at least one subject to continue.");
  }

  const config = await getDrillConfig(exam);
  const size = config[PURPOSE_SIZE_KEY[purpose]];

  const attemptId = await createDrillAttempt({ userId: session.user.id, exam, subjectIds, purpose, topic, size });
  redirect(`/practice/session/${attemptId}`);
}

/** Launched from the Topic Mastery drill-down — "practice this weak topic
 * right now" — always a single-subject, single-topic TOPIC_DRILL. */
export async function startTopicDrill(formData: FormData) {
  const session = await requireStudentSession();
  const exam = formData.get("exam") as ExamType;
  const subjectId = formData.get("subjectId") as string;
  const topic = formData.get("topic") as string;

  if (!subjectId || !topic) {
    throw new Error("Missing topic selection.");
  }

  const config = await getDrillConfig(exam);
  const attemptId = await createDrillAttempt({
    userId: session.user.id,
    exam,
    subjectIds: [subjectId],
    purpose: "TOPIC_DRILL",
    topic,
    size: config.topicDrillSize,
  });
  redirect(`/practice/session/${attemptId}`);
}

/** Full Mock — the exam-appropriate simulation. Subject count and
 * per-subject question count come from the exam's ExamDrillConfig rather
 * than assuming every exam has the same shape (item 11's explicit
 * requirement). Timing is a soft, client-side countdown: the configured
 * limit is passed through as a query param the session page reads, no new
 * duration field or hard server-side lock. */
export async function startFullMock(formData: FormData) {
  const session = await requireStudentSession();
  const exam = formData.get("exam") as ExamType;
  const requestedSubjectIds = formData.getAll("subjects") as string[];

  if (requestedSubjectIds.length === 0) {
    throw new Error("Select at least one subject to continue.");
  }

  const config = await getDrillConfig(exam);
  const subjectIds = requestedSubjectIds.slice(0, config.fullMockSubjectCount);

  const perSubjectResults = await Promise.all(
    subjectIds.map((subjectId) =>
      selectSmartQuestions({
        userId: session.user.id,
        exam,
        subjectIds: [subjectId],
        purpose: "CHALLENGE",
        size: config.fullMockQuestionsPerSubject,
      })
    )
  );
  const questionIds = perSubjectResults.flat();
  if (questionIds.length === 0) {
    throw new Error("No questions are available for that selection yet.");
  }

  const attempt = await prisma.examAttempt.create({
    data: {
      userId: session.user.id,
      exam,
      mode: "MOCK_EXAM",
      totalItems: questionIds.length,
      subjects: { connect: subjectIds.map((id) => ({ id })) },
      responses: { create: questionIds.map((questionId, index) => ({ questionId, order: index })) },
    },
  });
  redirect(`/practice/session/${attempt.id}?timeLimitMinutes=${config.fullMockTimeLimitMinutes}`);
}
