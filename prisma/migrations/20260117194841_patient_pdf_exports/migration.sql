-- CreateEnum
CREATE TYPE "PatientPdfExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "requestedIp" TEXT,
    "requestedUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_pdf_exports" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bullmqJobId" TEXT,
    "status" "PatientPdfExportStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "filename" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "errorMessage" TEXT,
    "requestedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "patient_pdf_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_pdf_export_logs" (
    "id" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "percentage" INTEGER,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_pdf_export_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "patient_pdf_exports_patientId_idx" ON "patient_pdf_exports"("patientId");

-- CreateIndex
CREATE INDEX "patient_pdf_exports_status_idx" ON "patient_pdf_exports"("status");

-- CreateIndex
CREATE INDEX "patient_pdf_exports_requestedAt_idx" ON "patient_pdf_exports"("requestedAt");

-- CreateIndex
CREATE INDEX "patient_pdf_export_logs_exportId_idx" ON "patient_pdf_export_logs"("exportId");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_pdf_exports" ADD CONSTRAINT "patient_pdf_exports_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_pdf_export_logs" ADD CONSTRAINT "patient_pdf_export_logs_exportId_fkey" FOREIGN KEY ("exportId") REFERENCES "patient_pdf_exports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
