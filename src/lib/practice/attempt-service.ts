import type { AttemptMode, ExamType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordTopicAttempts, refreshTopicInsights } from "@/lib/ai/mastery-service";
import { recordExamTopicAttempts, recordReadinessSnapshot } from "@/lib/practice/readiness-service";
import { buildSelectionUnits, selectContiguousUnits } from "@/lib/practice/attempt-selection";
import { examLabels } from "@/lib/exam-slugs";
import { notifyUser } from "@/lib/notify";
import { awardXp } from "@/lib/gamification/xp-service";

/** Core of src/app/practice/actions.ts's startAttempt/saveAnswer/
 * submitAttempt, extracted into plain-argument, non-redirecting
 * functions so a non-web caller (the WhatsApp integration) can reuse
 * the exact same question-selection and attempt-recording logic
 * instead of reimplementing it. The web Server Actions are now thin
 * wrappers around these — no behavior change there. */

export async function startAttemptForUser(
  userId: string,
  opts: {
    exam: ExamType;
    mode: AttemptMode;
    subjectIds: string[];
    requestedCount?: number;
    topic?: string;
    channel?: string;
  }
) {
  const { exam, mode, subjectIds, requestedCount = 10, topic, channel } = opts;

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
      userId,
      exam,
      mode,
      channel,
      totalItems: selectedIds.length,
      subjects: { connect: subjectIds.map((id) => ({ id })) },
      responses: {
        create: selectedIds.map((questionId, index) => ({ questionId, order: index })),
      },
    },
  });

  return attempt;
}

export async function assertOwnedInProgressAttempt(attemptId: string, userId: string) {
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

export async function saveAnswerForUser(
  userId: string,
  attemptId: string,
  questionId: string,
  selectedOption: string
) {
  await assertOwnedInProgressAttempt(attemptId, userId);

  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    select: { correctOption: true },
  });

  const isCorrect = selectedOption === question.correctOption;

  await prisma.questionResponse.update({
    where: { attemptId_questionId: { attemptId, questionId } },
    data: { selectedOption, isCorrect },
  });

  return { isCorrect };
}

export async function toggleFlagForUser(
  userId: string,
  attemptId: string,
  questionId: string,
  flagged: boolean
) {
  await assertOwnedInProgressAttempt(attemptId, userId);

  await prisma.questionResponse.update({
    where: { attemptId_questionId: { attemptId, questionId } },
    data: { flagged },
  });
}

export async function submitAttemptForUser(userId: string, attemptId: string) {
  await assertOwnedInProgressAttempt(attemptId, userId);

  const attempt = await prisma.examAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      responses: { include: { question: { select: { subjectId: true, topic: true } } } },
      user: { select: { name: true } },
    },
  });

  const correctCount = attempt.responses.filter((r) => r.isCorrect).length;
  const score = attempt.totalItems > 0 ? (correctCount / attempt.totalItems) * 100 : 0;

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { submittedAt: new Date(), score },
  });

  await awardXp(userId, "EXAM_ATTEMPT", attemptId);

  // Only mock exams, not every practice question — matches the brief's
  // example ("Tunde completed his UTME mock examination with 74%") without
  // spamming a parent on every short study-drill session.
  if (attempt.mode === "MOCK_EXAM") {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
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
    await recordTopicAttempts(userId, topicAttempts);
    await refreshTopicInsights(userId);
    // Exam-scoped counterpart (Exam Readiness feature) — same data, also
    // written to the per-exam mastery model so WAEC/UTME/NECO/Post-UTME
    // readiness stays distinct even for a shared subject/topic.
    await recordExamTopicAttempts(userId, attempt.exam, topicAttempts);
    await recordReadinessSnapshot(userId, attempt.exam);
  }

  return { score, correctCount, totalItems: attempt.totalItems };
}
