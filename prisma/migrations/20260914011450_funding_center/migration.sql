
-- CreateEnum
CREATE TYPE "FunderOrgType" AS ENUM ('PRIVATE_FOUNDATION', 'CORPORATE_FOUNDATION', 'CORPORATE_CSR', 'FAMILY_FOUNDATION', 'COMMUNITY_FOUNDATION', 'NGO', 'DEVELOPMENT_ORGANIZATION', 'MULTILATERAL_ORGANIZATION', 'GOVERNMENT_PROGRAM', 'PHILANTHROPIC_NETWORK', 'OTHER');

-- CreateEnum
CREATE TYPE "RelationshipStrength" AS ENUM ('NO_RELATIONSHIP', 'IDENTIFIED', 'INTRODUCED', 'INITIAL_CONTACT', 'CONVERSATION_STARTED', 'ACTIVE_RELATIONSHIP', 'EXISTING_PARTNER');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('RESEARCH', 'QUALIFIED', 'PREPARING_LOI', 'LOI_SUBMITTED', 'INVITED_TO_APPLY', 'PROPOSAL_DRAFTING', 'SUBMITTED', 'UNDER_REVIEW', 'AWARDED', 'DECLINED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OpportunityProgramTag" AS ENUM ('GENERAL', 'AI_TUTOR_10K');

-- CreateEnum
CREATE TYPE "OutreachType" AS ENUM ('EMAIL', 'PHONE', 'MEETING', 'INTRODUCTION', 'CONFERENCE', 'LINKEDIN', 'REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "KnowledgeEntryStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "EducationAccessBudgetLineItem" DROP CONSTRAINT "EducationAccessBudgetLineItem_grantId_fkey";

-- DropForeignKey
ALTER TABLE "EducationAccessGrant" DROP CONSTRAINT "EducationAccessGrant_internalOwnerId_fkey";

-- AlterTable
ALTER TABLE "EducationAccessBudgetLineItem" DROP COLUMN "grantId",
ADD COLUMN     "opportunityId" TEXT;

-- AlterTable
ALTER TABLE "PlatformSettings" ADD COLUMN     "aiTutorFundingGoalCurrency" TEXT,
ADD COLUMN     "aiTutorFundingGoalMinor" INTEGER,
ADD COLUMN     "aiTutorFundingGoalPublicVisibility" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "staleOpportunityThresholdDays" INTEGER NOT NULL DEFAULT 90;

-- DropTable
DROP TABLE "EducationAccessGrant";

-- DropEnum
DROP TYPE "EducationAccessGrantStatus";

-- CreateTable
CREATE TABLE "EducationAccessFunder" (
    "id" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "organizationType" "FunderOrgType" NOT NULL,
    "website" TEXT,
    "country" TEXT,
    "headquarters" TEXT,
    "geographicFocus" TEXT,
    "fundingFocus" TEXT,
    "educationFocus" BOOLEAN NOT NULL DEFAULT false,
    "technologyFocus" BOOLEAN NOT NULL DEFAULT false,
    "youthFocus" BOOLEAN NOT NULL DEFAULT false,
    "africaFocus" BOOLEAN NOT NULL DEFAULT false,
    "nigeriaFocus" BOOLEAN NOT NULL DEFAULT false,
    "typicalMinGrantMinor" INTEGER,
    "typicalMaxGrantMinor" INTEGER,
    "currency" TEXT,
    "applicationMethod" TEXT,
    "acceptsUnsolicitedProposals" BOOLEAN,
    "notes" TEXT,
    "sourceUrl" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationAccessFunder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAccessFunderContact" (
    "id" TEXT NOT NULL,
    "funderId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "relationshipStrength" "RelationshipStrength" NOT NULL DEFAULT 'NO_RELATIONSHIP',
    "notes" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationAccessFunderContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAccessFundingOpportunity" (
    "id" TEXT NOT NULL,
    "funderId" TEXT NOT NULL,
    "opportunityName" TEXT NOT NULL,
    "description" TEXT,
    "opportunityUrl" TEXT,
    "country" TEXT,
    "geographicFocus" TEXT,
    "fundingFocus" TEXT,
    "eligibleCountries" TEXT,
    "eligibleOrgTypes" TEXT,
    "minimumAwardMinor" INTEGER,
    "maximumAwardMinor" INTEGER,
    "currency" TEXT,
    "applicationOpenDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "rollingDeadline" BOOLEAN NOT NULL DEFAULT false,
    "applicationMethod" TEXT,
    "loiRequired" BOOLEAN NOT NULL DEFAULT false,
    "matchFundingRequired" BOOLEAN NOT NULL DEFAULT false,
    "eligibilityNotes" TEXT,
    "programNotes" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'RESEARCH',
    "priority" "GrantPriority" NOT NULL DEFAULT 'MEDIUM',
    "programTag" "OpportunityProgramTag" NOT NULL DEFAULT 'GENERAL',
    "missionScore" INTEGER,
    "geographicScore" INTEGER,
    "programScore" INTEGER,
    "eligibilityScore" INTEGER,
    "fundingScore" INTEGER,
    "timingScore" INTEGER,
    "totalScore" INTEGER,
    "eligibilityChecklist" JSONB,
    "amountRequestedMinor" INTEGER,
    "amountAwardedMinor" INTEGER,
    "sourceUrl" TEXT,
    "sourceName" TEXT,
    "retrievedDate" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "nextAction" TEXT,
    "nextActionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationAccessFundingOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAccessApplication" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFTING',
    "requiredDocumentsNote" TEXT,
    "budgetNarrative" TEXT,
    "teamNotes" TEXT,
    "timelineNotes" TEXT,
    "submissionNotes" TEXT,
    "followUpNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationAccessApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAccessApplicationQuestion" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "response" TEXT,
    "wordLimit" INTEGER,
    "characterLimit" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "internalNotes" TEXT,
    "lastUpdatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationAccessApplicationQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAccessOutreach" (
    "id" TEXT NOT NULL,
    "funderId" TEXT NOT NULL,
    "contactId" TEXT,
    "opportunityId" TEXT,
    "type" "OutreachType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT,
    "subject" TEXT,
    "notes" TEXT,
    "response" TEXT,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationAccessOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAccessTask" (
    "id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "opportunityId" TEXT,
    "ownerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" "GrantPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationAccessTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAccessSavedSearch" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationAccessSavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAccessKnowledgeEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "approvedContent" TEXT NOT NULL,
    "status" "KnowledgeEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationAccessKnowledgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EducationAccessFunderContact_funderId_idx" ON "EducationAccessFunderContact"("funderId");

-- CreateIndex
CREATE INDEX "EducationAccessFundingOpportunity_status_priority_idx" ON "EducationAccessFundingOpportunity"("status", "priority");

-- CreateIndex
CREATE INDEX "EducationAccessFundingOpportunity_deadline_idx" ON "EducationAccessFundingOpportunity"("deadline");

-- CreateIndex
CREATE INDEX "EducationAccessApplication_opportunityId_idx" ON "EducationAccessApplication"("opportunityId");

-- CreateIndex
CREATE INDEX "EducationAccessApplicationQuestion_applicationId_idx" ON "EducationAccessApplicationQuestion"("applicationId");

-- CreateIndex
CREATE INDEX "EducationAccessOutreach_funderId_idx" ON "EducationAccessOutreach"("funderId");

-- CreateIndex
CREATE INDEX "EducationAccessOutreach_opportunityId_idx" ON "EducationAccessOutreach"("opportunityId");

-- CreateIndex
CREATE INDEX "EducationAccessTask_status_dueDate_idx" ON "EducationAccessTask"("status", "dueDate");

-- AddForeignKey
ALTER TABLE "EducationAccessFunderContact" ADD CONSTRAINT "EducationAccessFunderContact_funderId_fkey" FOREIGN KEY ("funderId") REFERENCES "EducationAccessFunder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessFundingOpportunity" ADD CONSTRAINT "EducationAccessFundingOpportunity_funderId_fkey" FOREIGN KEY ("funderId") REFERENCES "EducationAccessFunder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessFundingOpportunity" ADD CONSTRAINT "EducationAccessFundingOpportunity_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessBudgetLineItem" ADD CONSTRAINT "EducationAccessBudgetLineItem_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "EducationAccessFundingOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessApplication" ADD CONSTRAINT "EducationAccessApplication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "EducationAccessFundingOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessApplicationQuestion" ADD CONSTRAINT "EducationAccessApplicationQuestion_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "EducationAccessApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessApplicationQuestion" ADD CONSTRAINT "EducationAccessApplicationQuestion_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessOutreach" ADD CONSTRAINT "EducationAccessOutreach_funderId_fkey" FOREIGN KEY ("funderId") REFERENCES "EducationAccessFunder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessOutreach" ADD CONSTRAINT "EducationAccessOutreach_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "EducationAccessFunderContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessOutreach" ADD CONSTRAINT "EducationAccessOutreach_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "EducationAccessFundingOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessOutreach" ADD CONSTRAINT "EducationAccessOutreach_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessTask" ADD CONSTRAINT "EducationAccessTask_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "EducationAccessFundingOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessTask" ADD CONSTRAINT "EducationAccessTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessSavedSearch" ADD CONSTRAINT "EducationAccessSavedSearch_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessKnowledgeEntry" ADD CONSTRAINT "EducationAccessKnowledgeEntry_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

