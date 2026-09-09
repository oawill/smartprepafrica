// DB-backed tests for the Discussions + Ask a tutor access-control logic
// (src/lib/learning/discussion-access.ts). The "use server" action file
// itself (discussion-actions.ts) calls auth() and isn't unit-tested by
// convention — resolveParticipant is the extracted, directly-testable
// seam, same pattern as src/lib/authz.ts's requireTeacherProfile.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, uniqueSuffix, createUser, deleteUsers } from "../helpers/fixtures";
import { resolveParticipant } from "../../src/lib/learning/discussion-access";

describe("resolveParticipant", () => {
  const userIds: string[] = [];
  const courseIds: string[] = [];

  after(async () => {
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    await deleteUsers(userIds);
  });

  async function makeCourse(teacherId?: string) {
    const course = await prisma.course.create({
      data: {
        title: `Discussion Test Course ${uniqueSuffix()}`,
        description: "test",
        category: "ACADEMIC",
        requiresSubscription: false,
        teacherId,
      },
    });
    courseIds.push(course.id);
    return course;
  }

  test("throws for a user who is neither enrolled nor the course's teacher nor an admin", async () => {
    const student = await createUser("STUDENT", "discussion-outsider");
    userIds.push(student.id);
    const course = await makeCourse();

    await assert.rejects(() => resolveParticipant(student.id, course.id), /need to be enrolled/i);
  });

  test("succeeds for an enrolled student, with isTeacher/isAdmin both false", async () => {
    const student = await createUser("STUDENT", "discussion-enrolled");
    userIds.push(student.id);
    const course = await makeCourse();
    await prisma.courseEnrollment.create({ data: { userId: student.id, courseId: course.id } });

    const result = await resolveParticipant(student.id, course.id);
    assert.equal(result.isTeacher, false);
    assert.equal(result.isAdmin, false);
  });

  test("succeeds for the course's own teacher, with isTeacher true", async () => {
    const teacherUser = await createUser("TEACHER", "discussion-teacher");
    userIds.push(teacherUser.id);
    const teacherProfile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, applicationStatus: "APPROVED" },
    });
    const course = await makeCourse(teacherProfile.id);

    const result = await resolveParticipant(teacherUser.id, course.id);
    assert.equal(result.isTeacher, true);
    assert.equal(result.isAdmin, false);
  });

  test("a teacher of a DIFFERENT course is not treated as this course's teacher", async () => {
    const teacherUser = await createUser("TEACHER", "discussion-other-teacher");
    userIds.push(teacherUser.id);
    await prisma.teacherProfile.create({ data: { userId: teacherUser.id, applicationStatus: "APPROVED" } });
    const course = await makeCourse(); // no teacher assigned

    await assert.rejects(() => resolveParticipant(teacherUser.id, course.id), /need to be enrolled/i);
  });

  test("succeeds for an admin holding discussions.manage, with isAdmin true", async () => {
    const admin = await createUser("ADMIN", "discussion-admin");
    userIds.push(admin.id);
    await prisma.user.update({ where: { id: admin.id }, data: { adminRole: "USER_SUPPORT_ADMIN" } });
    const course = await makeCourse();

    const result = await resolveParticipant(admin.id, course.id);
    assert.equal(result.isAdmin, true);
    assert.equal(result.isTeacher, false);
  });

  test("an admin WITHOUT discussions.manage is not granted access", async () => {
    const admin = await createUser("ADMIN", "discussion-wrong-admin");
    userIds.push(admin.id);
    await prisma.user.update({ where: { id: admin.id }, data: { adminRole: "FINANCE_ADMIN" } });
    const course = await makeCourse();

    await assert.rejects(() => resolveParticipant(admin.id, course.id), /need to be enrolled/i);
  });
});
