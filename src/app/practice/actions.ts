"use server";

import { redirect } from "next/navigation";
import type { AttemptMode, ExamType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordTopicAttempts, refreshTopicInsights } from "@/lib/ai/mastery-service";

export async function startAttempt(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const exam = formData.get("exam") as ExamType;
  const mode = formData.get("mode") as AttemptMode;
  const subjectIds = formData.getAll("subjects") as string[];
  const requestedCount = Number(formData.get("count")) || 10;
  const topic = (formData.get("topic") as string) || undefined;

  if (subjectIds.length === 0) {
    throw new Error("Select at least one subject to continue.");
  }

  const eligible = await prisma.question.findMany({
    where: {
      exam,
      subjectId: { in: subjectIds },
      status: "PUBLISHED",
      ...(topic ? { topic } : {}),
    },
    select: { id: true },
  });

  if (eligible.length === 0) {
    throw new Error("No questions are available for that selection yet.");
  }

  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(requestedCount, shuffled.length));

  const attempt = await prisma.examAttempt.create({
    data: {
      userId: session.user.id,
      exam,
      mode,
      totalItems: selected.length,
      subjects: { connect: subjectIds.map((id) => ({ id })) },
      responses: {
        create: selected.map((q, index) => ({ questionId: q.id, order: index })),
      },
    },
  });

  redirect(`/practice/session/${attempt.id}`);
}

async function assertOwnedInProgressAttempt(attemptId: string, userId: string) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { userId: true, submittedAt: true },
  });

  if (!attempt || attempt.userId !== userId) {
    throw new Error("Attempt not found.");
  }
  if (attempt.submittedAt) {
    throw new Error("This attempt has already been submitted.");
  }
}

export async function saveAnswer(
  attemptId: string,
  questionId: string,
  selectedOption: string
) {
  const session = await auth();
  if (!session) redirect("/login");

  await assertOwnedInProgressAttempt(attemptId, session.user.id);

  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    select: { correctOption: true },
  });

  await prisma.questionResponse.update({
    where: { attemptId_questionId: { attemptId, questionId } },
    data: {
      selectedOption,
      isCorrect: selectedOption === question.correctOption,
    },
  });
}

export async function submitAttempt(attemptId: string) {
  const session = await auth();
  if (!session) redirect("/login");

  await assertOwnedInProgressAttempt(attemptId, session.user.id);

  const attempt = await prisma.examAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      responses: { include: { question: { select: { subjectId: true, topic: true } } } },
    },
  });

  const correctCount = attempt.responses.filter((r) => r.isCorrect).length;
  const score =
    attempt.totalItems > 0 ? (correctCount / attempt.totalItems) * 100 : 0;

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date(), score },
  });

  const topicAttempts = attempt.responses
    .filter((r) => r.question.topic && r.isCorrect !== null)
    .map((r) => ({
      subjectId: r.question.subjectId,
      topic: r.question.topic!,
      isCorrect: r.isCorrect!,
    }));
  if (topicAttempts.length > 0) {
    await recordTopicAttempts(session.user.id, topicAttempts);
    await refreshTopicInsights(session.user.id);
  }

  redirect(`/practice/results/${attemptId}`);
}
