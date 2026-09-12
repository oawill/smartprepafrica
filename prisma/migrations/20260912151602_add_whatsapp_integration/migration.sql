-- CreateEnum
CREATE TYPE "WhatsAppFlowState" AS ENUM ('MAIN_MENU', 'AWAITING_EXAM', 'AWAITING_SUBJECT', 'IN_PRACTICE');

-- CreateEnum
CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- AlterTable
ALTER TABLE "ExamAttempt" ADD COLUMN     "channel" TEXT;

-- CreateTable
CREATE TABLE "WhatsAppAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3),
    "optInAt" TIMESTAMP(3),
    "optOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppLinkToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppConversationState" (
    "id" TEXT NOT NULL,
    "whatsappAccountId" TEXT NOT NULL,
    "state" "WhatsAppFlowState" NOT NULL DEFAULT 'MAIN_MENU',
    "context" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConversationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessageLog" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "direction" "WhatsAppMessageDirection" NOT NULL,
    "whatsappAccountId" TEXT,
    "providerMessageId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAccount_userId_key" ON "WhatsAppAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAccount_phoneNumber_key" ON "WhatsAppAccount"("phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppAccount_phoneNumber_idx" ON "WhatsAppAccount"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppLinkToken_token_key" ON "WhatsAppLinkToken"("token");

-- CreateIndex
CREATE INDEX "WhatsAppLinkToken_phoneNumber_idx" ON "WhatsAppLinkToken"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConversationState_whatsappAccountId_key" ON "WhatsAppConversationState"("whatsappAccountId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_phoneNumber_idx" ON "WhatsAppMessageLog"("phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_createdAt_idx" ON "WhatsAppMessageLog"("createdAt");

-- AddForeignKey
ALTER TABLE "WhatsAppAccount" ADD CONSTRAINT "WhatsAppAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversationState" ADD CONSTRAINT "WhatsAppConversationState_whatsappAccountId_fkey" FOREIGN KEY ("whatsappAccountId") REFERENCES "WhatsAppAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
