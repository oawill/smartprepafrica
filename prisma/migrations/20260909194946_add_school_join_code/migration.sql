-- AlterTable
ALTER TABLE "School" ADD COLUMN     "joinCode" TEXT,
ADD COLUMN     "joinPin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "School_joinCode_key" ON "School"("joinCode");
