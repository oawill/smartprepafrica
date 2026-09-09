-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false;

-- Archive the two live Skills-vertical courses (Financial Literacy,
-- Coding) — the Skills catalog section is being removed, but these two
-- real courses keep resolving for their already-enrolled learners.
UPDATE "Course" SET "archived" = true
WHERE "id" IN ('seed-course-financial-literacy', 'seed-course-intro-coding');
