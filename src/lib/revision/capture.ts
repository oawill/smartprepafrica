import type { ExamType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeRevisionOutcome } from "@/lib/revision/schedule";
import { computeRevisionPriority } from "@/lib/revision/priority";

type ScoredResponse = {
  questionId: string;
  isCorrect: boolean | null;
  question: { subjectId: string; topic: string | null };
};

/** Days until the soonest exam relevant to this subject, or null if none
 * has a saved date — same signal the Study Plan scheduler uses, kept
 * consistent by reusing computeRevisionPriority's own examProximityBucket
 * import rather than a second lookup here; this just supplies the raw
 * day count. */
async function daysToExamForSubject(userId: string, exam: ExamType, now: Date): Promise<number | null> {
  const profile = await prisma.studentExamProfile.findUnique({
    where: { userId_exam: { userId, exam } },
    select: { examDate: true },
  });
  if (!profile?.examDate) return null;
  return Math.round((profile.examDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

/** The single write path into StudentRevisionItem — called from
 * submitAttemptForUser regardless of attempt mode, so practice, drills,
 * mocks, past-questions, Today's Study, and revision sessions themselves
 * all feed the same bank through here. Never duplicates a row: every
 * write is an upsert on the [userId, questionId] unique key. */
export async function recordRevisionOutcomes(userId: string, exam: ExamType, responses: ScoredResponse[]): Promise<void> {
  const now = new Date();

  for (const r of responses) {
    if (r.isCorrect === null) continue;

    const existing = await prisma.studentRevisionItem.findUnique({
      where: { userId_questionId: { userId, questionId: r.questionId } },
    });

    if (r.isCorrect === false) {
      const daysToExam = await daysToExamForSubject(userId, exam, now);
      const incorrectCount = (existing?.incorrectCount ?? 0) + 1;

      if (!existing) {
        // The very first miss — no review has happened yet, so no
        // interval to shorten; nextReviewAt stays unset until the
        // student actually reviews it once.
        const priority = computeRevisionPriority({ incorrectCount, status: "NEW", daysToExam, nextReviewAt: null, now });
        await prisma.studentRevisionItem.create({
          data: {
            userId,
            questionId: r.questionId,
            subjectId: r.question.subjectId,
            topic: r.question.topic,
            exam,
            status: "NEW",
            priority,
            firstMissedAt: now,
            lastMissedAt: now,
            incorrectCount: 1,
          },
        });
        continue;
      }

      // A repeat miss on an item already being reviewed — shorten the
      // interval and reset progress (brief §8's "if wrong again").
      const outcome = computeRevisionOutcome({ correctReviewCount: existing.correctReviewCount }, false, now);
      const priority = computeRevisionPriority({
        incorrectCount,
        status: outcome.status,
        daysToExam,
        nextReviewAt: outcome.nextReviewAt,
        now,
      });

      await prisma.studentRevisionItem.update({
        where: { userId_questionId: { userId, questionId: r.questionId } },
        data: {
          lastMissedAt: now,
          incorrectCount: { increment: 1 },
          correctReviewCount: outcome.correctReviewCount,
          status: outcome.status,
          nextReviewAt: outcome.nextReviewAt,
          priority,
        },
      });
      continue;
    }

    // Correct — only meaningful if this question was previously missed.
    // A correct answer to a question with no revision history is just a
    // normal correct answer, not a "review."
    if (!existing) continue;

    const outcome = computeRevisionOutcome({ correctReviewCount: existing.correctReviewCount }, true, now);
    const daysToExam = await daysToExamForSubject(userId, exam, now);
    const priority = computeRevisionPriority({
      incorrectCount: existing.incorrectCount,
      status: outcome.status,
      daysToExam,
      nextReviewAt: outcome.nextReviewAt,
      now,
    });

    await prisma.studentRevisionItem.update({
      where: { userId_questionId: { userId, questionId: r.questionId } },
      data: {
        status: outcome.status,
        correctReviewCount: outcome.correctReviewCount,
        totalReviewCount: { increment: 1 },
        lastReviewedAt: now,
        nextReviewAt: outcome.nextReviewAt,
        priority,
      },
    });
  }
}
