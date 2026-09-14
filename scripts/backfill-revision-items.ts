// One-off backfill (brief's "Backfill Existing Mistakes"): populates
// StudentRevisionItem from QuestionResponse rows that already exist on
// SUBMITTED attempts, so students don't lose their historical mistakes
// just because Smart Revision launched after they made them.
//
// Deliberately simple, per the brief's own fallback framing ("if backfill
// is unsafe or expensive, leave history unchanged... document the
// decision"): this only aggregates WRONG responses into
// incorrectCount/firstMissedAt/lastMissedAt — every one of those fields
// is unambiguous from QuestionResponse (student, question, answer,
// correctness), no inference. It deliberately does NOT try to replay
// historical correct answers as "successful reviews" in chronological
// order — reconstructing review-by-review state (correctReviewCount,
// status progression, nextReviewAt) from old data would require assuming
// which correct answers were genuine "reviews" of a prior mistake versus
// first-attempt luck, which the brief explicitly says not to infer.
// Every backfilled item therefore starts fresh at status NEW/LEARNING
// with no review history — exactly like a mistake made today, just with
// its real historical incorrectCount/dates intact. From this point
// forward, src/lib/revision/capture.ts (wired into submitAttemptForUser)
// keeps every item current automatically.
//
// Safe to re-run: every write is an upsert keyed on [userId, questionId].
import { PrismaClient } from "@prisma/client";
import { computeRevisionPriority } from "../src/lib/revision/priority";

const prisma = new PrismaClient();

async function main() {
  const wrongResponses = await prisma.questionResponse.findMany({
    where: { isCorrect: false, attempt: { submittedAt: { not: null } } },
    select: {
      questionId: true,
      attempt: { select: { userId: true, exam: true, startedAt: true } },
      question: { select: { subjectId: true, topic: true } },
    },
  });

  type Group = {
    userId: string;
    questionId: string;
    subjectId: string;
    topic: string | null;
    exam: (typeof wrongResponses)[number]["attempt"]["exam"];
    incorrectCount: number;
    firstMissedAt: Date;
    lastMissedAt: Date;
  };
  const groups = new Map<string, Group>();

  for (const r of wrongResponses) {
    const key = `${r.attempt.userId}::${r.questionId}`;
    const existing = groups.get(key);
    if (existing) {
      existing.incorrectCount += 1;
      if (r.attempt.startedAt < existing.firstMissedAt) existing.firstMissedAt = r.attempt.startedAt;
      if (r.attempt.startedAt > existing.lastMissedAt) existing.lastMissedAt = r.attempt.startedAt;
    } else {
      groups.set(key, {
        userId: r.attempt.userId,
        questionId: r.questionId,
        subjectId: r.question.subjectId,
        topic: r.question.topic,
        exam: r.attempt.exam,
        incorrectCount: 1,
        firstMissedAt: r.attempt.startedAt,
        lastMissedAt: r.attempt.startedAt,
      });
    }
  }

  const examDateCache = new Map<string, number | null>();
  async function daysToExam(userId: string, exam: Group["exam"]): Promise<number | null> {
    const cacheKey = `${userId}::${exam}`;
    if (examDateCache.has(cacheKey)) return examDateCache.get(cacheKey)!;
    const profile = await prisma.studentExamProfile.findUnique({
      where: { userId_exam: { userId, exam } },
      select: { examDate: true },
    });
    const days = profile?.examDate ? Math.round((profile.examDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
    examDateCache.set(cacheKey, days);
    return days;
  }

  let created = 0;
  let updated = 0;
  for (const g of groups.values()) {
    const daysToExamValue = await daysToExam(g.userId, g.exam);
    const priority = computeRevisionPriority({
      incorrectCount: g.incorrectCount,
      status: "LEARNING",
      daysToExam: daysToExamValue,
      nextReviewAt: null,
    });

    const result = await prisma.studentRevisionItem.upsert({
      where: { userId_questionId: { userId: g.userId, questionId: g.questionId } },
      create: {
        userId: g.userId,
        questionId: g.questionId,
        subjectId: g.subjectId,
        topic: g.topic,
        exam: g.exam,
        status: g.incorrectCount > 1 ? "LEARNING" : "NEW",
        priority,
        firstMissedAt: g.firstMissedAt,
        lastMissedAt: g.lastMissedAt,
        incorrectCount: g.incorrectCount,
      },
      update: {}, // never overwrite a row capture.ts may already be tracking live
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
    else updated++;
  }

  console.log(`Backfill complete: ${groups.size} distinct (student, question) mistakes found.`);
  console.log(`Created ${created} new StudentRevisionItem row(s); ${updated} already existed and were left untouched.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
