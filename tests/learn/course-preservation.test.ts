// Integration test for Phase 2's preservation requirement: the seed
// courses' stable URLs and learner counts must survive schema changes to
// the Course/Module/Lesson hierarchy (here: adding LessonType.PDF +
// Lesson.pdfUrl/pdfSizeBytes). Real queries against the local dev database,
// same convention as tests/geo/*.test.ts from Phase 1. Assumes
// prisma/seed.ts has already been run.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

after(async () => {
  await prisma.$disconnect();
});

// Baseline captured this session, before any Phase 2 schema/code change —
// a real regression guard, not a no-op check. If these drift, something
// touched the seed courses' structure or enrollments, not just added PDF
// support.
const EXPECTED = [
  { id: "seed-course-financial-literacy", modules: 3, lessons: 6, enrollments: 1 },
  { id: "seed-course-intro-coding", modules: 2, lessons: 4, enrollments: 0 },
  { id: "seed-course-mathematics-foundations", modules: 1, lessons: 2, enrollments: 3 },
  { id: "seed-course-waec-success-blueprint", modules: 1, lessons: 2, enrollments: 0 },
  { id: "seed-course-rivers-math-masterclass", modules: 1, lessons: 1, enrollments: 1 },
  { id: "seed-course-kano-chemistry-bootcamp", modules: 1, lessons: 1, enrollments: 0 },
];

describe("seed-course-* preservation", () => {
  for (const expected of EXPECTED) {
    test(`${expected.id} still exists with its expected module/lesson/enrollment counts`, async () => {
      const course = await prisma.course.findUnique({
        where: { id: expected.id },
        include: {
          modules: { include: { lessons: true } },
          _count: { select: { enrollments: true } },
        },
      });
      assert.ok(course, `${expected.id} not found — run prisma/seed.ts`);
      assert.equal(course!.modules.length, expected.modules, "module count changed");
      const lessonCount = course!.modules.reduce((sum, m) => sum + m.lessons.length, 0);
      assert.equal(lessonCount, expected.lessons, "lesson count changed");
      assert.equal(course!._count.enrollments, expected.enrollments, "enrollment count changed");
    });
  }

  test("adding LessonType.PDF didn't change any existing lesson's type", async () => {
    const ids = EXPECTED.map((e) => e.id);
    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId: { in: ids } } },
      select: { type: true },
    });
    assert.ok(lessons.length > 0, "no lessons found for seed courses");
    assert.ok(
      lessons.every((l) => l.type !== "PDF"),
      "an existing seed lesson was unexpectedly changed to PDF"
    );
  });
});
