// DB-backed tests for the Prep<->Learning reverse loop crossover helper.
// Follows tests/helpers/fixtures.ts's real-database, manual-cleanup
// convention (no mocking, no transaction isolation).
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, uniqueSuffix, createUser, deleteUsers } from "../helpers/fixtures";
import { recordCrossoverAttempts, findExistingCrossoverSuggestion } from "../../src/lib/learning/prep-crossover";

describe("recordCrossoverAttempts", () => {
  const userIds: string[] = [];
  const subjectIds: string[] = [];
  const questionIds: string[] = [];

  after(async () => {
    await prisma.question.deleteMany({ where: { id: { in: questionIds } } });
    await prisma.studentExamTopicMastery.deleteMany({ where: { userId: { in: userIds } } });
    await deleteUsers(userIds);
    await prisma.subject.deleteMany({ where: { id: { in: subjectIds } } });
  });

  async function makeSubject() {
    const subject = await prisma.subject.create({ data: { name: `Crossover Test Subject ${uniqueSuffix()}` } });
    subjectIds.push(subject.id);
    return subject;
  }

  async function makeQuestion(subjectId: string, topic: string, exam: "WAEC" | "NECO" | "UTME" | "POST_UTME") {
    const q = await prisma.question.create({
      data: {
        exam,
        subjectId,
        topic,
        prompt: "Test question prompt",
        options: [{ key: "A", text: "1" }, { key: "B", text: "2" }],
        correctOption: "A",
      },
    });
    questionIds.push(q.id);
    return q;
  }

  test("returns null when the student has no target exams", async () => {
    const user = await createUser("STUDENT", "no-target-exams");
    userIds.push(user.id);
    const subject = await makeSubject();

    const result = await recordCrossoverAttempts({
      userId: user.id,
      subjectId: subject.id,
      topic: "Quadratic Equations",
      results: [{ isCorrect: false }],
    });

    assert.equal(result, null);
    const rows = await prisma.studentExamTopicMastery.findMany({ where: { userId: user.id } });
    assert.equal(rows.length, 0);
  });

  test("returns null when no Question bank row matches the topic", async () => {
    const user = await createUser("STUDENT", "no-matching-question");
    userIds.push(user.id);
    await prisma.studentProfile.create({ data: { userId: user.id, targetExams: ["WAEC"] } });
    const subject = await makeSubject();

    const result = await recordCrossoverAttempts({
      userId: user.id,
      subjectId: subject.id,
      topic: "A topic with no question bank coverage",
      results: [{ isCorrect: false }],
    });

    assert.equal(result, null);
  });

  test("dual-writes StudentExamTopicMastery and suggests a drill when the result is weak", async () => {
    const user = await createUser("STUDENT", "weak-topic");
    userIds.push(user.id);
    await prisma.studentProfile.create({ data: { userId: user.id, targetExams: ["WAEC"] } });
    const subject = await makeSubject();
    const topic = "Quadratic Equations";
    await makeQuestion(subject.id, topic, "WAEC");

    const result = await recordCrossoverAttempts({
      userId: user.id,
      subjectId: subject.id,
      topic,
      results: [{ isCorrect: false }, { isCorrect: false }, { isCorrect: false }],
    });

    assert.deepEqual(result, { exam: "WAEC", subjectId: subject.id, topic });

    const row = await prisma.studentExamTopicMastery.findUnique({
      where: { userId_exam_subjectId_topic: { userId: user.id, exam: "WAEC", subjectId: subject.id, topic } },
    });
    assert.ok(row, "expected a StudentExamTopicMastery row to be created");
    assert.equal(row!.questionsAttempted, 3);
    assert.ok(row!.masteryScore < 50);
  });

  test("dual-writes but returns no suggestion when mastery is strong", async () => {
    const user = await createUser("STUDENT", "strong-topic");
    userIds.push(user.id);
    await prisma.studentProfile.create({ data: { userId: user.id, targetExams: ["UTME"] } });
    const subject = await makeSubject();
    const topic = "Cell Biology";
    await makeQuestion(subject.id, topic, "UTME");

    // Enough correct attempts to clear the confidence threshold and land
    // above the STRONG cutoff (80).
    const results = Array.from({ length: 6 }, () => ({ isCorrect: true }));
    const result = await recordCrossoverAttempts({ userId: user.id, subjectId: subject.id, topic, results });

    assert.equal(result, null);
    const row = await prisma.studentExamTopicMastery.findUnique({
      where: { userId_exam_subjectId_topic: { userId: user.id, exam: "UTME", subjectId: subject.id, topic } },
    });
    assert.ok(row, "expected the dual-write to still happen even without a suggestion");
    assert.equal(row!.masteryScore, 100);
  });
});

describe("findExistingCrossoverSuggestion", () => {
  const userIds: string[] = [];
  const subjectIds: string[] = [];

  after(async () => {
    await prisma.studentExamTopicMastery.deleteMany({ where: { userId: { in: userIds } } });
    await deleteUsers(userIds);
    await prisma.subject.deleteMany({ where: { id: { in: subjectIds } } });
  });

  test("returns null when no matching mastery row exists yet", async () => {
    const user = await createUser("STUDENT", "no-existing-mastery");
    userIds.push(user.id);
    await prisma.studentProfile.create({ data: { userId: user.id, targetExams: ["WAEC"] } });
    const subject = await prisma.subject.create({ data: { name: `Crossover Read Test ${uniqueSuffix()}` } });
    subjectIds.push(subject.id);

    const result = await findExistingCrossoverSuggestion({
      userId: user.id,
      subjectId: subject.id,
      topic: "Untouched Topic",
    });
    assert.equal(result, null);
  });

  test("returns a suggestion for an existing weak mastery row within target exams", async () => {
    const user = await createUser("STUDENT", "existing-weak-mastery");
    userIds.push(user.id);
    await prisma.studentProfile.create({ data: { userId: user.id, targetExams: ["NECO"] } });
    const subject = await prisma.subject.create({ data: { name: `Crossover Read Test ${uniqueSuffix()}` } });
    subjectIds.push(subject.id);
    const topic = "Organic Chemistry";

    await prisma.studentExamTopicMastery.create({
      data: {
        userId: user.id,
        exam: "NECO",
        subjectId: subject.id,
        topic,
        masteryScore: 20,
        confidenceScore: 0.5,
        questionsAttempted: 5,
        questionsCorrect: 1,
      },
    });

    const result = await findExistingCrossoverSuggestion({ userId: user.id, subjectId: subject.id, topic });
    assert.deepEqual(result, { exam: "NECO", subjectId: subject.id, topic });
  });
});
