-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "currentStreakDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastActivityDate" TIMESTAMP(3),
ADD COLUMN     "leaderboardOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "longestStreakDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "XpEvent_userId_createdAt_idx" ON "XpEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "XpEvent_userId_type_sourceId_key" ON "XpEvent"("userId", "type", "sourceId");

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
