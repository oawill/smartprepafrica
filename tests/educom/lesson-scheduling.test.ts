// Integration test for Lesson.publishAt (drip content) — real queries
// against the local dev database, same convention as
// tests/rbac/authz-guards.test.ts. Creates its own throwaway
// Course/Module/Lesson fixtures, cleaned up in after().
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const courseIds: string[] = [];

after(async () => {
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  await prisma.$disconnect();
});

// Mirrors the exact where-clause used in both student-facing lesson
// queries (src/app/educom/[courseId]/page.tsx and
// src/app/educom/[courseId]/lessons/[lessonId]/page.tsx).
function visibleLessonsWhere(courseId: string) {
  return {
    module: { courseId },
    moderationStatus: "PUBLISHED" as const,
    OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
  };
}

describe("Lesson.publishAt (drip content)", () => {
  test("a lesson with a future publishAt is excluded from the visible-lessons query", async () => {
    const suffix = Date.now();
    const course = await prisma.course.create({
      data: {
        title: `Scheduling Test Course ${suffix}`,
        description: "test",
        category: "ACADEMIC",
        published: true,
        modules: {
          create: {
            title: "Module 1",
            order: 0,
            lessons: {
              create: [
                {
                  title: "Immediate lesson",
                  type: "TEXT",
                  content: "x",
                  order: 0,
                  moderationStatus: "PUBLISHED",
                  publishAt: null,
                },
                {
                  title: "Past-scheduled lesson",
                  type: "TEXT",
                  content: "x",
                  order: 1,
                  moderationStatus: "PUBLISHED",
                  publishAt: new Date(Date.now() - 60_000),
                },
                {
                  title: "Future-scheduled lesson",
                  type: "TEXT",
                  content: "x",
                  order: 2,
                  moderationStatus: "PUBLISHED",
                  publishAt: new Date(Date.now() + 60 * 60 * 1000),
                },
              ],
            },
          },
        },
      },
    });
    courseIds.push(course.id);

    const visible = await prisma.lesson.findMany({
      where: visibleLessonsWhere(course.id),
      orderBy: { order: "asc" },
      select: { title: true },
    });

    assert.deepEqual(
      visible.map((l) => l.title),
      ["Immediate lesson", "Past-scheduled lesson"]
    );
  });
});
