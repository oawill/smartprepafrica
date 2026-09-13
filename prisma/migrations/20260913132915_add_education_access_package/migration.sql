-- CreateEnum
CREATE TYPE "EducationAccessPackage" AS ENUM ('STUDENT_SPONSOR', 'CLASSROOM_SPONSOR', 'SCHOOL_PARTNER', 'COMMUNITY_CHAMPION', 'FLAGSHIP_AI_TUTOR', 'CUSTOM');

-- AlterTable
ALTER TABLE "EducationAccessInquiry" ADD COLUMN     "packageInterest" "EducationAccessPackage";
