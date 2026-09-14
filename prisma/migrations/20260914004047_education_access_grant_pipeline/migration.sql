-- CreateEnum
CREATE TYPE "EducationAccessGrantStatus" AS ENUM ('PROSPECT', 'RESEARCHING', 'QUALIFIED', 'NOT_QUALIFIED', 'PREPARING', 'SUBMITTED', 'UNDER_REVIEW', 'AWARDED', 'DECLINED', 'ACTIVE', 'REPORTING', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GrantPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "BudgetCategory" AS ENUM ('PROGRAM_ACCESS', 'CONTENT', 'SCHOOL_ENGAGEMENT', 'TECHNOLOGY', 'MONITORING_EVALUATION', 'PROGRAM_ADMINISTRATION');

-- AlterTable
ALTER TABLE "EducationAccessInquiry" ADD COLUMN     "estimatedFundingRange" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "preferredContactMethod" TEXT;

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "annualCostPerStudentMinor" INTEGER,
ADD COLUMN     "costPerStudentApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "costPerStudentCurrency" TEXT,
ADD COLUMN     "orgDataPrivacyNote" TEXT,
ADD COLUMN     "orgFinancialNote" TEXT,
ADD COLUMN     "orgGovernanceNote" TEXT,
ADD COLUMN     "orgLeadershipNote" TEXT,
ADD COLUMN     "orgMissionNote" TEXT,
ADD COLUMN     "orgRegistrationNote" TEXT,
ADD COLUMN     "orgSafeguardingNote" TEXT;

-- CreateTable
CREATE TABLE "EducationAccessGrant" (
    "id" TEXT NOT NULL,
    "funderName" TEXT NOT NULL,
    "programName" TEXT,
    "grantType" TEXT,
    "country" TEXT,
    "website" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "fundingArea" TEXT,
    "geographicFocus" TEXT,
    "typicalGrantSize" TEXT,
    "deadline" TIMESTAMP(3),
    "eligibility" TEXT,
    "amountRequestedMinor" INTEGER,
    "amountAwardedMinor" INTEGER,
    "currency" TEXT,
    "applicationDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "EducationAccessGrantStatus" NOT NULL DEFAULT 'PROSPECT',
    "priority" "GrantPriority" NOT NULL DEFAULT 'MEDIUM',
    "reportingFrequency" TEXT,
    "nextReportDue" TIMESTAMP(3),
    "nextAction" TEXT,
    "internalOwnerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAccessBudgetLineItem" (
    "id" TEXT NOT NULL,
    "grantId" TEXT,
    "category" "BudgetCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unitCostMinor" INTEGER,
    "totalCostMinor" INTEGER,
    "currency" TEXT,
    "fundingSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationAccessBudgetLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EducationAccessGrant_status_priority_idx" ON "EducationAccessGrant"("status", "priority");

-- AddForeignKey
ALTER TABLE "EducationAccessGrant" ADD CONSTRAINT "EducationAccessGrant_internalOwnerId_fkey" FOREIGN KEY ("internalOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessBudgetLineItem" ADD CONSTRAINT "EducationAccessBudgetLineItem_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "EducationAccessGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
