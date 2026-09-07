"use server";

import { redirect } from "next/navigation";
import type { AttemptMode, ExamType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordTopicAttempts, refreshTopicInsights } from "@/lib/ai/mastery-service";
import { recordExamTopicAttempts, recordReadinessSnapshot } from "@/lib/practice/readiness-service";
import { buildSelectionUnits, selectContiguousUnits } from "@/lib/practice/attempt-selection";
import { examLabels } from "@/lib/exam-slugs";
import { notifyUser } from "@/lib/notify";

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
      OR: [{ passageGroupId: null }, { passageGroup: { status: "PUBLISHED" } }],
    },
    select: { id: true, passageGroupId: true, passageOrder: true },
  });

  if (eligible.length === 0) {
    throw new Error("No questions are available for that selection yet.");
  }

  // A topic filter can match only some members of a passage group, but a
  // passage's questions must always be read together — so pull in the full
  // published set for any group that showed up at all. This can rarely
  // widen a topic-filtered session by a sibling question outside the
  // requested topic; accepted since the original code never guaranteed an
  // exact question count either.
  const partialGroupIds = topic
    ? [...new Set(eligible.filter((q) => q.passageGroupId).map((q) => q.passageGroupId!))]
    : [];
  const eligibleById = new Map(eligible.map((q) => [q.id, q]));
  if (partialGroupIds.length > 0) {
    const fullGroupMembers = await prisma.question.findMany({
      where: {
        passageGroupId: { in: partialGroupIds },
        status: "PUBLISHED",
        passageGroup: { status: "PUBLISHED" },
      },
      select: { id: true, passageGroupId: true, passageOrder: true },
    });
    for (const q of fullGroupMembers) eligibleById.set(q.id, q);
  }

  const units = buildSelectionUnits([...eligibleById.values()]);
  const selectedIds = selectContiguousUnits(units, requestedCount);

  if (selectedIds.length === 0) {
    throw new Error("No questions are available for that selection yet.");
  }

  const attempt = await prisma.examAttempt.create({
    data: {
      userId: session.user.id,
      exam,
      mode,
      totalItems: selectedIds.length,
      subjects: { connect: subjectIds.map((id) => ({ id })) },
      responses: {
        create: selectedIds.map((questionId, index) => ({ questionId, order: index })),
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

export async function toggleFlag(
  attemptId: string,
  questionId: string,
  flagged: boolean
) {
  const session = await auth();
  if (!session) redirect("/login");

  await assertOwnedInProgressAttempt(attemptId, session.user.id);

  await prisma.questionResponse.update({
    where: { attemptId_questionId: { attemptId, questionId } },
    data: { flagged },
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
      user: { select: { name: true } },
    },
  });

  const correctCount = attempt.responses.filter((r) => r.isCorrect).length;
  const score =
    attempt.totalItems > 0 ? (correctCount / attempt.totalItems) * 100 : 0;

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date(), score },
  });

  // Only mock exams, not every practice question — matches the brief's
  // example ("Tunde completed his UTME mock examination with 74%") without
  // spamming a parent on every short study-drill session.
  if (attempt.mode === "MOCK_EXAM") {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: { parentLinks: { where: { status: "ACTIVE" } } },
    });
    for (const link of studentProfile?.parentLinks ?? []) {
      await notifyUser(
        link.parentId,
        "MOCK_EXAM_COMPLETED",
        `${attempt.user.name} completed a ${examLabels[attempt.exam]} mock exam with ${Math.round(score)}%.`,
        `/dashboard/parent/children/${studentProfile!.id}`
      );
    }
  }

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
    // Exam-scoped counterpart (Exam Readiness feature) — same data, also
    // written to the per-exam mastery model so WAEC/UTME/NECO/Post-UTME
    // readiness stays distinct even for a shared subject/topic.
    await recordExamTopicAttempts(session.user.id, attempt.exam, topicAttempts);
    await recordReadinessSnapshot(session.user.id, attempt.exam);
  }

  redirect(`/practice/results/${attemptId}`);
}
