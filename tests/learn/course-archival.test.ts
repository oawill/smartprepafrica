// Tests for the Skills-vertical archival gate: an archived course 404s
// for a non-enrolled visitor and resolves normally for an enrolled one.
// Combines a pure test of the extracted gate condition with a DB-backed
// check that the real CourseEnrollment lookup the course-detail page
// uses produces the right input to that gate — same
// tests/helpers/fixtures.ts convention as the rest of this suite.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, uniqueSuffix, createUser, deleteUsers } from "../helpers/fixtures";
import { shouldHideArchivedCourse } from "../../src/lib/learning/course-access";

describe("shouldHideArchivedCourse", () => {
  test("hides an archived course from a non-enrolled visitor", () => {
    assert.equal(shouldHideArchivedCourse(true, false), true);
  });

  test("still shows an archived course to an already-enrolled learner", () => {
    assert.equal(shouldHideArchivedCourse(true, true), false);
  });

  test("never hides a non-archived course, enrolled or not", () => {
    assert.equal(shouldHideArchivedCourse(false, false), false);
    assert.equal(shouldHideArchivedCourse(false, true), false);
  });
});

describe("archived course + enrollment lookup (DB-backed)", () => {
  const userIds: string[] = [];
  const courseIds: string[] = [];

  after(async () => {
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    await deleteUsers(userIds);
  });

  async function makeArchivedCourse() {
    const course = await prisma.course.create({
      data: {
        title: `Archived Test Course ${uniqueSuffix()}`,
        description: "test",
        category: "ACADEMIC",
        requiresSubscription: false,
        archived: true,
      },
    });
    courseIds.push(course.id);
    return course;
  }

  test("a non-enrolled user's lookup produces no enrollment, so the gate hides it", async () => {
    const course = await makeArchivedCourse();
    const student = await createUser("STUDENT", "archival-non-enrolled");
    userIds.push(student.id);

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
    });

    assert.equal(enrollment, null);
    assert.equal(shouldHideArchivedCourse(course.archived, !!enrollment), true);
  });

  test("an enrolled user's lookup finds their enrollment, so the gate lets them through", async () => {
    const course = await makeArchivedCourse();
    const student = await createUser("STUDENT", "archival-enrolled");
    userIds.push(student.id);
    await prisma.courseEnrollment.create({ data: { userId: student.id, courseId: course.id } });

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
    });

    assert.ok(enrollment);
    assert.equal(shouldHideArchivedCourse(course.archived, !!enrollment), false);
  });
});
