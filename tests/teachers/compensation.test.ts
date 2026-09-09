// DB-backed tests for awardEnrollmentCommission — real queries against
// the local dev database, matching tests/helpers/fixtures.ts's
// convention (no mocking, manual cleanup).
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, uniqueSuffix, createUser, deleteUsers } from "../helpers/fixtures";
import { awardEnrollmentCommission, getTeacherPayoutSettings } from "../../src/lib/teachers/compensation";

describe("awardEnrollmentCommission", () => {
  const userIds: string[] = [];
  const courseIds: string[] = [];

  after(async () => {
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    await deleteUsers(userIds);
  });

  async function makeTeacher(label: string) {
    const user = await createUser("TEACHER", label);
    userIds.push(user.id);
    const profile = await prisma.teacherProfile.create({ data: { userId: user.id, applicationStatus: "APPROVED" } });
    return { user, profile };
  }

  async function makeCourse(opts: { teacherId?: string; requiresSubscription: boolean }) {
    const course = await prisma.course.create({
      data: {
        title: `Payout Test Course ${uniqueSuffix()}`,
        description: "test",
        category: "ACADEMIC",
        requiresSubscription: opts.requiresSubscription,
        teacherId: opts.teacherId,
      },
    });
    courseIds.push(course.id);
    return course;
  }

  test("creates no commission for a course with no teacher", async () => {
    const course = await makeCourse({ requiresSubscription: true });
    const student = await createUser("STUDENT", "no-teacher-student");
    userIds.push(student.id);

    await awardEnrollmentCommission(course.id, student.id);

    const commissions = await prisma.teacherCommission.findMany({ where: { courseId: course.id } });
    assert.equal(commissions.length, 0);
  });

  test("creates no commission for a free (requiresSubscription: false) course", async () => {
    const { profile } = await makeTeacher("free-course-teacher");
    const course = await makeCourse({ teacherId: profile.id, requiresSubscription: false });
    const student = await createUser("STUDENT", "free-course-student");
    userIds.push(student.id);

    await awardEnrollmentCommission(course.id, student.id);

    const commissions = await prisma.teacherCommission.findMany({ where: { courseId: course.id } });
    assert.equal(commissions.length, 0);
  });

  test("creates exactly one commission and one notification for a real qualifying enrollment", async () => {
    const { profile, user: teacherUser } = await makeTeacher("qualifying-teacher");
    const course = await makeCourse({ teacherId: profile.id, requiresSubscription: true });
    const student = await createUser("STUDENT", "qualifying-student");
    userIds.push(student.id);

    await awardEnrollmentCommission(course.id, student.id);

    const commissions = await prisma.teacherCommission.findMany({ where: { courseId: course.id } });
    assert.equal(commissions.length, 1);

    const settings = await getTeacherPayoutSettings();
    assert.equal(commissions[0].amountKobo, settings.commissionPerEnrollmentKobo);
    assert.equal(commissions[0].status, "AVAILABLE");

    const notifications = await prisma.notification.findMany({
      where: { userId: teacherUser.id, type: "TEACHER_COMMISSION_EARNED" },
    });
    assert.equal(notifications.length, 1);
  });

  test("calling it twice for the same teacher+course+student only ever creates one commission", async () => {
    const { profile } = await makeTeacher("idempotent-teacher");
    const course = await makeCourse({ teacherId: profile.id, requiresSubscription: true });
    const student = await createUser("STUDENT", "idempotent-student");
    userIds.push(student.id);

    await awardEnrollmentCommission(course.id, student.id);
    await awardEnrollmentCommission(course.id, student.id);

    const commissions = await prisma.teacherCommission.findMany({
      where: { teacherId: profile.id, courseId: course.id, studentUserId: student.id },
    });
    assert.equal(commissions.length, 1);
  });
});
