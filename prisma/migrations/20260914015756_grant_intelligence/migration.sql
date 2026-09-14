
-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('GRANT', 'CSR_PARTNERSHIP', 'STRATEGIC_PARTNERSHIP');

-- CreateEnum
CREATE TYPE "FiscalSponsorshipStatus" AS ENUM ('NOT_REQUIRED', 'MAY_BE_REQUIRED', 'REQUIRED', 'IDENTIFIED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "DiscoverySourceType" AS ENUM ('FOUNDATION_WEBSITE', 'CORPORATE_CSR', 'GOVERNMENT_PORTAL', 'PHILANTHROPIC_NETWORK', 'DEVELOPMENT_ORG', 'GRANT_DATABASE', 'MANUAL_URL', 'APPROVED_API', 'OTHER');

-- CreateEnum
CREATE TYPE "DiscoveryVerificationStatus" AS ENUM ('UNVERIFIED', 'AI_EXTRACTED', 'NEEDS_REVIEW', 'PARTIALLY_VERIFIED', 'VERIFIED', 'OUTDATED', 'INVALID');

-- CreateEnum
CREATE TYPE "DuplicateStatus" AS ENUM ('NEW', 'POSSIBLE_DUPLICATE', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "DismissalReason" AS ENUM ('NOT_ELIGIBLE', 'POOR_FIT', 'DEADLINE_TOO_SOON', 'FUNDING_TOO_SMALL', 'FUNDING_RESTRICTIONS', 'GEOGRAPHIC_MISMATCH', 'PROGRAM_MISMATCH', 'DUPLICATE', 'EXPIRED', 'NOT_CURRENTLY_PURSUING', 'OTHER');

-- CreateEnum
CREATE TYPE "ReadinessCategory" AS ENUM ('CORPORATE_DOCUMENTS', 'FINANCIAL', 'PROGRAM', 'POLICIES', 'IMPACT');

-- CreateEnum
CREATE TYPE "ReadinessStatus" AS ENUM ('AVAILABLE', 'DRAFT', 'NEEDS_UPDATE', 'MISSING');

-- AlterTable
ALTER TABLE "EducationAccessFunder" ADD COLUMN     "knownPrograms" TEXT,
ADD COLUMN     "overview" TEXT,
ADD COLUMN     "permitsCorporatePartnership" BOOLEAN,
ADD COLUMN     "permitsDirectInternationalGrants" BOOLEAN,
ADD COLUMN     "permitsFiscalSponsorship" BOOLEAN,
ADD COLUMN     "permitsForProfitSocialEnterprise" BOOLEAN,
ADD COLUMN     "permitsInternationalOrgs" BOOLEAN,
ADD COLUMN     "permitsProgramRelatedInvestment" BOOLEAN,
ADD COLUMN     "researchNotes" TEXT,
ADD COLUMN     "watchlistNotes" TEXT,
ADD COLUMN     "watchlistReason" TEXT,
ADD COLUMN     "watchlisted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EducationAccessFundingOpportunity" DROP COLUMN "eligibilityScore",
DROP COLUMN "fundingScore",
DROP COLUMN "geographicScore",
DROP COLUMN "missionScore",
DROP COLUMN "programScore",
ADD COLUMN     "aiTechScore" INTEGER,
ADD COLUMN     "digitalLearningScore" INTEGER,
ADD COLUMN     "educationAccessScore" INTEGER,
ADD COLUMN     "educationScore" INTEGER,
ADD COLUMN     "estimatedValueDescription" TEXT,
ADD COLUMN     "estimatedValueMinor" INTEGER,
ADD COLUMN     "fiscalSponsorshipStatus" "FiscalSponsorshipStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "fundingPotentialScore" INTEGER,
ADD COLUMN     "nigeriaAfricaScore" INTEGER,
ADD COLUMN     "opportunityType" "OpportunityType" NOT NULL DEFAULT 'GRANT',
ADD COLUMN     "youthScore" INTEGER;

-- AlterTable
ALTER TABLE "EducationAccessSavedSearch" ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ADD COLUMN     "schedule" TEXT;

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "recommendedFitScoreThreshold" INTEGER NOT NULL DEFAULT 70;

-- CreateTable
CREATE TABLE "EducationAccessGrantDiscovery" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" "DiscoverySourceType" NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "externalId" TEXT,
    "funderName" TEXT NOT NULL,
    "opportunityName" TEXT NOT NULL,
    "opportunityUrl" TEXT,
    "description" TEXT,
    "fundingFocus" TEXT,
    "fundingCategories" TEXT[],
    "geographicFocus" TEXT,
    "minimumAwardMinor" INTEGER,
    "maximumAwardMinor" INTEGER,
    "currency" TEXT,
    "deadline" TIMESTAMP(3),
    "rollingDeadline" BOOLEAN NOT NULL DEFAULT false,
    "eligibilitySummary" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "verificationStatus" "DiscoveryVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verificationChecklist" JSONB,
    "duplicateStatus" "DuplicateStatus" NOT NULL DEFAULT 'NEW',
    "duplicateOfId" TEXT,
    "educationScore" INTEGER,
    "nigeriaAfricaScore" INTEGER,
    "educationAccessScore" INTEGER,
    "digitalLearningScore" INTEGER,
    "aiTechScore" INTEGER,
    "youthScore" INTEGER,
    "fundingPotentialScore" INTEGER,
    "timingScore" INTEGER,
    "totalScore" INTEGER,
    "importedOpportunityId" TEXT,
    "dismissedAt" TIMESTAMP(3),
    "dismissedReason" "DismissalReason",
    "dismissedById" TEXT,
    "watchNextCycle" BOOLEAN NOT NULL DEFAULT false,
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "rawMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationAccessGrantDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAccessReadinessItem" (
    "id" TEXT NOT NULL,
    "category" "ReadinessCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "status" "ReadinessStatus" NOT NULL DEFAULT 'MISSING',
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationAccessReadinessItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EducationAccessGrantDiscovery_importedOpportunityId_key" ON "EducationAccessGrantDiscovery"("importedOpportunityId");

-- CreateIndex
CREATE INDEX "EducationAccessGrantDiscovery_verificationStatus_idx" ON "EducationAccessGrantDiscovery"("verificationStatus");

-- CreateIndex
CREATE INDEX "EducationAccessGrantDiscovery_duplicateStatus_idx" ON "EducationAccessGrantDiscovery"("duplicateStatus");

-- CreateIndex
CREATE INDEX "EducationAccessGrantDiscovery_deadline_idx" ON "EducationAccessGrantDiscovery"("deadline");

-- AddForeignKey
ALTER TABLE "EducationAccessGrantDiscovery" ADD CONSTRAINT "EducationAccessGrantDiscovery_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "EducationAccessGrantDiscovery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessGrantDiscovery" ADD CONSTRAINT "EducationAccessGrantDiscovery_importedOpportunityId_fkey" FOREIGN KEY ("importedOpportunityId") REFERENCES "EducationAccessFundingOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessGrantDiscovery" ADD CONSTRAINT "EducationAccessGrantDiscovery_dismissedById_fkey" FOREIGN KEY ("dismissedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

