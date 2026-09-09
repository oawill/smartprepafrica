-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "preferredPaymentMethod" TEXT;

-- CreateTable
CREATE TABLE "TeacherCommission" (
    "id" TEXT NOT NULL,
    "commissionNumber" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'AVAILABLE',
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "TeacherCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherPayout" (
    "id" TEXT NOT NULL,
    "payoutNumber" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "destinationSnapshot" JSONB,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "paidAt" TIMESTAMP(3),
    "rejectedReason" TEXT,

    CONSTRAINT "TeacherPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherPayoutSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "minimumPayoutKobo" INTEGER NOT NULL DEFAULT 1000000,
    "commissionPerEnrollmentKobo" INTEGER NOT NULL DEFAULT 50000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherPayoutSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherCommission_commissionNumber_key" ON "TeacherCommission"("commissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherCommission_teacherId_courseId_studentUserId_key" ON "TeacherCommission"("teacherId", "courseId", "studentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherPayout_payoutNumber_key" ON "TeacherPayout"("payoutNumber");

-- AddForeignKey
ALTER TABLE "TeacherCommission" ADD CONSTRAINT "TeacherCommission_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherCommission" ADD CONSTRAINT "TeacherCommission_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherCommission" ADD CONSTRAINT "TeacherCommission_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "TeacherPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherPayout" ADD CONSTRAINT "TeacherPayout_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
