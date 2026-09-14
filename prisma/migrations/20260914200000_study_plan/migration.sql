-- CreateEnum
CREATE TYPE "StudyDayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "StudyPeriod" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'NO_PREFERENCE');

-- CreateEnum
CREATE TYPE "StudyPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'STALE');

-- CreateEnum
CREATE TYPE "StudyActivityType" AS ENUM ('LESSON', 'PRACTICE_DRILL', 'MOCK_EXAM', 'AI_COACH_SESSION', 'REVIEW_MISTAKES');

-- CreateEnum
CREATE TYPE "StudyPlanItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'MISSED', 'RESCHEDULED');

-- AlterTable
ALTER TABLE "StudentExamProfile" ADD COLUMN     "examDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "dailyStudyMinutes" INTEGER,
ADD COLUMN     "preferredStudyPeriod" "StudyPeriod",
ADD COLUMN     "studyDays" "StudyDayOfWeek"[] DEFAULT ARRAY[]::"StudyDayOfWeek"[];

-- CreateTable
CREATE TABLE "StudyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "status" "StudyPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRegeneratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regenerationReason" TEXT,
    "inputFingerprint" TEXT NOT NULL,
    "subjectMasterySnapshot" JSONB,

    CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPlanItem" (
    "id" TEXT NOT NULL,
    "studyPlanId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "subjectId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "activityType" "StudyActivityType" NOT NULL,
    "activityReference" TEXT,
    "recommendedMinutes" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "StudyPlanItemStatus" NOT NULL DEFAULT 'PENDING',
    "recommendationReason" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StudyPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlan_userId_weekStart_key" ON "StudyPlan"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "StudyPlanItem_studyPlanId_date_idx" ON "StudyPlanItem"("studyPlanId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlanItem_studyPlanId_date_subjectId_topic_activityType_key" ON "StudyPlanItem"("studyPlanId", "date", "subjectId", "topic", "activityType");

-- AddForeignKey
ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
