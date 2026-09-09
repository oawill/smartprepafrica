"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordTopicAttempt } from "@/lib/ai/mastery-service";
import { recordCrossoverAttempts, type PrepDrillSuggestion } from "@/lib/learning/prep-crossover";
import { markLessonComplete } from "@/app/educom/actions";

const AUTO_COMPLETE_PERCENT = 90;

async function assertEnrolled(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    select: { module: { select: { courseId: true } } },
  });
  const courseId = lesson.module.courseId;
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) throw new Error("You need to enroll in this course first.");
  return { enrollment, courseId };
}

/** Periodic/debounced resume-position sync from the video player — NOT one
 * write per timeupdate event. percentWatched is a high-water-mark (never
 * regresses on rewatch/scrub-back). Tolerant of being called out of order
 * or after a dropped connection: it just writes current truth each time. */
export async function syncLessonProgress(
  lessonId: string,
  positionSeconds: number,
  percentWatched: number
) {
  const session = await auth();
  if (!session) return;

  const { enrollment } = await assertEnrolled(session.user.id, lessonId);

  const existing = await prisma.lessonProgress.findUnique({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
  });
  const nextPercent = Math.max(existing?.percentWatched ?? 0, percentWatched);

  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    update: { lastPositionSeconds: positionSeconds, percentWatched: nextPercent, lastWatchedAt: new Date() },
    create: {
      enrollmentId: enrollment.id,
      lessonId,
      lastPositionSeconds: positionSeconds,
      percentWatched: nextPercent,
      lastWatchedAt: new Date(),
    },
  });

  if (nextPercent >= AUTO_COMPLETE_PERCENT && !existing?.completedAt) {
    await markLessonComplete(lessonId);
  }
}

export type CheckpointAnswerResult = {
  isCorrect: boolean;
  correctOption: string;
  explanation: string | null;
  prepDrill: PrepDrillSuggestion | null;
};

/** Grades an in-video checkpoint answer, records it for the AI tutor's
 * "recent checkpoint mistakes" context and the wrong-answer review flow,
 * and — only when the lesson has a topic and the course has a subject —
 * feeds StudentTopicMastery exactly like a graded practice question would.
 * Skills-category courses (no subjectId) simply skip mastery recording
 * rather than fabricating one, matching the existing mastery-service ethos. */
export async function answerCheckpoint(
  lessonId: string,
  quizQuestionId: string,
  selectedOption: string
): Promise<CheckpointAnswerResult> {
  const session = await auth();
  if (!session) throw new Error("Sign in required.");

  await assertEnrolled(session.user.id, lessonId);

  const question = await prisma.quizQuestion.findUniqueOrThrow({
    where: { id: quizQuestionId },
    select: {
      correctOption: true,
      explanation: true,
      lessonId: true,
      lesson: { select: { topic: true, module: { select: { course: { select: { subjectId: true } } } } } },
    },
  });
  if (question.lessonId !== lessonId) throw new Error("Checkpoint does not belong to this lesson.");

  const isCorrect = selectedOption === question.correctOption;

  await prisma.lessonCheckpointResponse.create({
    data: { userId: session.user.id, quizQuestionId, selectedOption, isCorrect },
  });

  const subjectId = question.lesson.module.course.subjectId;
  const topic = question.lesson.topic;
  let prepDrill: PrepDrillSuggestion | null = null;
  if (subjectId && topic) {
    await recordTopicAttempt({ userId: session.user.id, subjectId, topic, isCorrect });
    prepDrill = await recordCrossoverAttempts({
      userId: session.user.id,
      subjectId,
      topic,
      results: [{ isCorrect }],
    });
  }

  return { isCorrect, correctOption: question.correctOption, explanation: question.explanation, prepDrill };
}
