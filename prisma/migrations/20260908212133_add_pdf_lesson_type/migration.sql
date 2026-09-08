-- AlterEnum
ALTER TYPE "LessonType" ADD VALUE 'PDF';

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "pdfSizeBytes" INTEGER,
ADD COLUMN     "pdfUrl" TEXT;
