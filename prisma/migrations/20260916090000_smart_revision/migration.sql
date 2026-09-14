-- CreateEnum
CREATE TYPE "RevisionItemStatus" AS ENUM ('NEW', 'LEARNING', 'IMPROVING', 'MASTERED');

-- AlterEnum
ALTER TYPE "AttemptMode" ADD VALUE 'REVISION';

-- CreateTable
CREATE TABLE "StudentRevisionItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "topic" TEXT,
    "exam" "ExamType" NOT NULL,
    "status" "RevisionItemStatus" NOT NULL DEFAULT 'NEW',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "firstMissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "incorrectCount" INTEGER NOT NULL DEFAULT 1,
    "correctReviewCount" INTEGER NOT NULL DEFAULT 0,
    "totalReviewCount" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentRevisionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentRevisionItem_userId_status_archived_idx" ON "StudentRevisionItem"("userId", "status", "archived");

-- CreateIndex
CREATE INDEX "StudentRevisionItem_userId_subjectId_topic_idx" ON "StudentRevisionItem"("userId", "subjectId", "topic");

-- CreateIndex
CREATE INDEX "StudentRevisionItem_userId_nextReviewAt_idx" ON "StudentRevisionItem"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentRevisionItem_userId_questionId_key" ON "StudentRevisionItem"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "StudentRevisionItem" ADD CONSTRAINT "StudentRevisionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRevisionItem" ADD CONSTRAINT "StudentRevisionItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRevisionItem" ADD CONSTRAINT "StudentRevisionItem_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
