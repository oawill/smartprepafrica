-- DropForeignKey
ALTER TABLE "TeacherCommission" DROP CONSTRAINT "TeacherCommission_courseId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherCommission" DROP CONSTRAINT "TeacherCommission_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherPayout" DROP CONSTRAINT "TeacherPayout_teacherId_fkey";

-- AddForeignKey
ALTER TABLE "TeacherCommission" ADD CONSTRAINT "TeacherCommission_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherCommission" ADD CONSTRAINT "TeacherCommission_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherPayout" ADD CONSTRAINT "TeacherPayout_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
