-- CreateEnum
CREATE TYPE "TeacherApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "publishAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN     "applicationStatus" "TeacherApplicationStatus" NOT NULL DEFAULT 'PENDING';

-- Grandfather every teacher who already existed before this migration —
-- only NEW self-registrations should start PENDING. Must run before any
-- new TeacherProfile can be created against this schema.
UPDATE "TeacherProfile" SET "applicationStatus" = 'APPROVED';
