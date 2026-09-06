"use server";

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeSkillScore } from "@/lib/toefl/scoring";
import { isToeflEnabled } from "@/lib/toefl/config";

async function assertOwnedInProgressToeflAttempt(attemptId: string, userId: string) {
  const attempt = await prisma.toeflAttempt.findUnique({
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

export async function startReadingPractice() {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const content = await prisma.toeflContent.findMany({
    where: { skill: "READING", status: "PUBLISHED" },
    orderBy: { createdAt: "asc" },
  });
  if (content.length === 0) {
    throw new Error("Reading practice content isn't available yet.");
  }

  const attempt = await prisma.toeflAttempt.create({
    data: {
      userId: session.user.id,
      kind: "SKILL_PRACTICE",
      skill: "READING",
      items: {
        create: content.map((c, i) => ({ contentId: c.id, order: i })),
      },
    },
  });

  redirect(`/international-exams/toefl/reading/session/${attempt.id}`);
}

export async function saveReadingAnswer(itemId: string, selectedOption: string) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  const item = await prisma.toeflAttemptItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { attempt: { select: { id: true, userId: true, submittedAt: true } }, content: { select: { correctOption: true } } },
  });
  if (item.attempt.userId !== session.user.id) throw new Error("Attempt not found.");
  if (item.attempt.submittedAt) throw new Error("This attempt has already been submitted.");

  await prisma.toeflAttemptItem.update({
    where: { id: itemId },
    data: { selectedOption, isCorrect: selectedOption === item.content.correctOption },
  });
}

export async function submitReadingAttempt(attemptId: string) {
  if (!isToeflEnabled()) notFound();
  const session = await auth();
  if (!session) redirect("/login");

  await assertOwnedInProgressToeflAttempt(attemptId, session.user.id);

  const items = await prisma.toeflAttemptItem.findMany({ where: { attemptId } });
  const correctCount = items.filter((i) => i.isCorrect).length;
  const readingScore = computeSkillScore(correctCount, items.length);

  await prisma.toeflAttempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date(), readingScore },
  });

  redirect(`/international-exams/toefl/reading/results/${attemptId}`);
}
