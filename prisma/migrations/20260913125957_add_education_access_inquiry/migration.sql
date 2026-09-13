-- CreateEnum
CREATE TYPE "EducationAccessOrgType" AS ENUM ('INDIVIDUAL', 'CORPORATION', 'FOUNDATION', 'NGO', 'SCHOOL', 'DIASPORA_ORGANIZATION', 'ALUMNI_ASSOCIATION', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "EducationAccessInterest" AS ENUM ('SPONSOR_STUDENT', 'SPONSOR_SCHOOL', 'SPONSOR_COMMUNITY', 'AI_TUTOR_10K', 'GIRLS_IN_STEM', 'CORPORATE_CSR', 'FOUNDATION_PARTNERSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "EducationAccessStatus" AS ENUM ('NEW', 'CONTACTED', 'UNDER_REVIEW', 'PARTNER_CONFIRMED', 'SPONSORED', 'CLOSED');

-- CreateTable
CREATE TABLE "EducationAccessInquiry" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "organization" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT,
    "organizationType" "EducationAccessOrgType" NOT NULL,
    "sponsorshipInterest" "EducationAccessInterest" NOT NULL,
    "estimatedStudents" INTEGER,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "status" "EducationAccessStatus" NOT NULL DEFAULT 'NEW',
    "assignedToId" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationAccessInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EducationAccessInquiry_status_createdAt_idx" ON "EducationAccessInquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EducationAccessInquiry_ipHash_createdAt_idx" ON "EducationAccessInquiry"("ipHash", "createdAt");

-- AddForeignKey
ALTER TABLE "EducationAccessInquiry" ADD CONSTRAINT "EducationAccessInquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessInquiry" ADD CONSTRAINT "EducationAccessInquiry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
