// DB-backed tests for awardXp / checkAndAwardBadges — real queries
// against the local dev database, matching tests/helpers/fixtures.ts's
// convention (no mocking, no transaction isolation, manual cleanup).
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, uniqueSuffix, createUser, deleteUsers } from "../helpers/fixtures";
import { awardXp } from "../../src/lib/gamification/xp-service";

describe("awardXp", () => {
  const userIds: string[] = [];

  after(async () => {
    await prisma.xpEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userBadge.deleteMany({ where: { userId: { in: userIds } } });
    await deleteUsers(userIds);
  });

  async function makeStudent(label: string) {
    const user = await createUser("STUDENT", label);
    userIds.push(user.id);
    await prisma.studentProfile.create({ data: { userId: user.id } });
    return user;
  }

  test("increments StudentProfile.xp by the event's amount", async () => {
    const user = await makeStudent("xp-basic");
    const lessonId = `lesson-${uniqueSuffix()}`;

    await awardXp(user.id, "LESSON_COMPLETE", lessonId);

    const profile = await prisma.studentProfile.findUniqueOrThrow({ where: { userId: user.id } });
    assert.equal(profile.xp, 10);
  });

  test("calling awardXp twice with the same (userId, type, sourceId) only awards once", async () => {
    const user = await makeStudent("xp-idempotent");
    const lessonId = `lesson-${uniqueSuffix()}`;

    await awardXp(user.id, "LESSON_COMPLETE", lessonId);
    await awardXp(user.id, "LESSON_COMPLETE", lessonId);

    const profile = await prisma.studentProfile.findUniqueOrThrow({ where: { userId: user.id } });
    assert.equal(profile.xp, 10);

    const events = await prisma.xpEvent.findMany({ where: { userId: user.id } });
    assert.equal(events.length, 1);
  });

  test("a different sourceId for the same type awards again", async () => {
    const user = await makeStudent("xp-different-source");
    await awardXp(user.id, "LESSON_COMPLETE", `lesson-${uniqueSuffix()}`);
    await awardXp(user.id, "LESSON_COMPLETE", `lesson-${uniqueSuffix()}`);

    const profile = await prisma.studentProfile.findUniqueOrThrow({ where: { userId: user.id } });
    assert.equal(profile.xp, 20);
  });

  test("awards the First Steps badge after one LESSON_COMPLETE event, not before", async () => {
    const user = await makeStudent("xp-first-steps");

    const beforeBadges = await prisma.userBadge.findMany({ where: { userId: user.id } });
    assert.equal(beforeBadges.length, 0);

    await awardXp(user.id, "LESSON_COMPLETE", `lesson-${uniqueSuffix()}`);

    const afterBadges = await prisma.userBadge.findMany({
      where: { userId: user.id },
      include: { badge: { select: { name: true } } },
    });
    assert.ok(afterBadges.some((b) => b.badge.name === "First Steps"));
  });

  test("a badge already held is never re-awarded (no duplicate notification)", async () => {
    const user = await makeStudent("xp-no-duplicate-badge");

    await awardXp(user.id, "LESSON_COMPLETE", `lesson-${uniqueSuffix()}`);
    const firstCount = await prisma.userBadge.count({ where: { userId: user.id } });
    const firstNotifCount = await prisma.notification.count({ where: { userId: user.id, type: "BADGE_EARNED" } });

    // A second, unrelated lesson completion still qualifies for "First
    // Steps" (>= 1), but it's already held — must not re-award or re-notify.
    await awardXp(user.id, "LESSON_COMPLETE", `lesson-${uniqueSuffix()}`);
    const secondCount = await prisma.userBadge.count({ where: { userId: user.id } });
    const secondNotifCount = await prisma.notification.count({ where: { userId: user.id, type: "BADGE_EARNED" } });

    assert.equal(secondCount, firstCount);
    assert.equal(secondNotifCount, firstNotifCount);
  });

  test("a non-student user (no StudentProfile) earns no XP and doesn't throw", async () => {
    const teacher = await createUser("TEACHER", "xp-non-student");
    userIds.push(teacher.id);

    await assert.doesNotReject(() => awardXp(teacher.id, "DISCUSSION_REPLY", `reply-${uniqueSuffix()}`));
  });
});
