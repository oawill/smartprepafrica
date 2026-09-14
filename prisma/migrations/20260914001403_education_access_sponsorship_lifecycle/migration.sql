-- CreateEnum
CREATE TYPE "EducationAccessPaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'PARTIALLY_PAID', 'REFUNDED');

-- AlterEnum (hand-edited: backfills existing rows through a TEXT intermediate
-- cast + explicit value mapping, since the old and new enum labels don't
-- fully overlap — NEW -> INQUIRY, PARTNER_CONFIRMED -> CONFIRMED,
-- SPONSORED -> ACTIVE; every other label is unchanged)
BEGIN;
CREATE TYPE "EducationAccessStatus_new" AS ENUM ('INQUIRY', 'CONTACTED', 'PROPOSAL_SENT', 'UNDER_REVIEW', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CLOSED');
ALTER TABLE "public"."EducationAccessInquiry" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "EducationAccessInquiry" ALTER COLUMN "status" TYPE TEXT USING ("status"::text);
UPDATE "EducationAccessInquiry" SET "status" = CASE "status"
  WHEN 'NEW' THEN 'INQUIRY'
  WHEN 'PARTNER_CONFIRMED' THEN 'CONFIRMED'
  WHEN 'SPONSORED' THEN 'ACTIVE'
  ELSE "status"
END;
ALTER TABLE "EducationAccessInquiry" ALTER COLUMN "status" TYPE "EducationAccessStatus_new" USING ("status"::"EducationAccessStatus_new");
ALTER TYPE "EducationAccessStatus" RENAME TO "EducationAccessStatus_old";
ALTER TYPE "EducationAccessStatus_new" RENAME TO "EducationAccessStatus";
DROP TYPE "public"."EducationAccessStatus_old";
ALTER TABLE "EducationAccessInquiry" ALTER COLUMN "status" SET DEFAULT 'INQUIRY';
COMMIT;

-- AlterTable
ALTER TABLE "EducationAccessInquiry" ADD COLUMN     "amountMinor" INTEGER,
ADD COLUMN     "consentGiven" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "paymentStatus" "EducationAccessPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "paystackReference" TEXT,
ADD COLUMN     "preferredLocation" TEXT,
ADD COLUMN     "preferredSchoolId" TEXT,
ADD COLUMN     "programId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'INQUIRY';

-- CreateTable
CREATE TABLE "EducationAccessBeneficiary" (
    "id" TEXT NOT NULL,
    "sponsorshipId" TEXT NOT NULL,
    "studentId" TEXT,
    "schoolId" TEXT,
    "programType" TEXT,
    "accessStartDate" TIMESTAMP(3),
    "accessEndDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationAccessBeneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationAccessPartner" (
    "id" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "organizationType" "EducationAccessOrgType" NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "country" TEXT,
    "website" TEXT,
    "partnershipStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "logoUrl" TEXT,
    "publicVisibility" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationAccessPartner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EducationAccessBeneficiary_sponsorshipId_idx" ON "EducationAccessBeneficiary"("sponsorshipId");

-- CreateIndex
CREATE INDEX "EducationAccessPartner_publicVisibility_idx" ON "EducationAccessPartner"("publicVisibility");

-- CreateIndex
CREATE UNIQUE INDEX "EducationAccessInquiry_paystackReference_key" ON "EducationAccessInquiry"("paystackReference");

-- AddForeignKey
ALTER TABLE "EducationAccessInquiry" ADD CONSTRAINT "EducationAccessInquiry_preferredSchoolId_fkey" FOREIGN KEY ("preferredSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessInquiry" ADD CONSTRAINT "EducationAccessInquiry_programId_fkey" FOREIGN KEY ("programId") REFERENCES "SponsorshipProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessBeneficiary" ADD CONSTRAINT "EducationAccessBeneficiary_sponsorshipId_fkey" FOREIGN KEY ("sponsorshipId") REFERENCES "EducationAccessInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessBeneficiary" ADD CONSTRAINT "EducationAccessBeneficiary_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationAccessBeneficiary" ADD CONSTRAINT "EducationAccessBeneficiary_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
