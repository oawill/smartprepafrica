-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "schoolLicensePurchaseId" TEXT;

-- CreateTable
CREATE TABLE "SchoolLicensePurchase" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "purchasedById" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "seatCount" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "reference" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "SchoolLicensePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolLicensePurchase_reference_key" ON "SchoolLicensePurchase"("reference");

-- CreateIndex
CREATE INDEX "SchoolLicensePurchase_schoolId_idx" ON "SchoolLicensePurchase"("schoolId");

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_schoolLicensePurchaseId_fkey" FOREIGN KEY ("schoolLicensePurchaseId") REFERENCES "SchoolLicensePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolLicensePurchase" ADD CONSTRAINT "SchoolLicensePurchase_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolLicensePurchase" ADD CONSTRAINT "SchoolLicensePurchase_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
