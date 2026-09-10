-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeCourse" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProgrammeCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeCertificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationCode" TEXT,

    CONSTRAINT "ProgrammeCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeCourse_programmeId_courseId_key" ON "ProgrammeCourse"("programmeId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeCertificate_verificationCode_key" ON "ProgrammeCertificate"("verificationCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeCertificate_userId_programmeId_key" ON "ProgrammeCertificate"("userId", "programmeId");

-- AddForeignKey
ALTER TABLE "ProgrammeCourse" ADD CONSTRAINT "ProgrammeCourse_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammeCourse" ADD CONSTRAINT "ProgrammeCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammeCertificate" ADD CONSTRAINT "ProgrammeCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammeCertificate" ADD CONSTRAINT "ProgrammeCertificate_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
