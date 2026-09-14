
-- CreateEnum
CREATE TYPE "AcademicTrack" AS ENUM ('SCIENCE', 'ARTS', 'COMMERCIAL', 'UNDECIDED');

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "academicTrack" "AcademicTrack",
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "studyGoal" TEXT;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "academicTracks" "AcademicTrack"[] DEFAULT ARRAY[]::"AcademicTrack"[];

-- CreateTable
CREATE TABLE "_StudentWeakSubjects" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StudentWeakSubjects_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_StudentWeakSubjects_B_index" ON "_StudentWeakSubjects"("B");

-- AddForeignKey
ALTER TABLE "_StudentWeakSubjects" ADD CONSTRAINT "_StudentWeakSubjects_A_fkey" FOREIGN KEY ("A") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentWeakSubjects" ADD CONSTRAINT "_StudentWeakSubjects_B_fkey" FOREIGN KEY ("B") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

