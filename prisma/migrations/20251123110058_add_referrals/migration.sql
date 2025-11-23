/*
  Warnings:

  - You are about to drop the column `details` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `resource` on the `audit_logs` table. All the data in the column will be lost.
  - Made the column `resourceId` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."audit_logs" DROP COLUMN "details",
DROP COLUMN "resource",
ADD COLUMN     "changes" JSONB,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "resourceType" TEXT NOT NULL DEFAULT 'MEDICAL_RECORD',
ALTER COLUMN "resourceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."consultations" ADD COLUMN     "meetingLink" TEXT,
ADD COLUMN     "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."medical_records" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."prescriptions" ADD COLUMN     "digitalSignature" TEXT;

-- CreateTable
CREATE TABLE "public"."referrals" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rate_limit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "rate_limit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_logs_userId_operation_timestamp_idx" ON "public"."rate_limit_logs"("userId", "operation", "timestamp");

-- CreateIndex
CREATE INDEX "rate_limit_logs_expiresAt_idx" ON "public"."rate_limit_logs"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_resourceId_createdAt_idx" ON "public"."audit_logs"("resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_createdAt_idx" ON "public"."audit_logs"("resourceType", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_success_createdAt_idx" ON "public"."audit_logs"("success", "createdAt");

-- CreateIndex
CREATE INDEX "medical_records_patientId_idx" ON "public"."medical_records"("patientId");

-- CreateIndex
CREATE INDEX "medical_records_doctorId_idx" ON "public"."medical_records"("doctorId");

-- CreateIndex
CREATE INDEX "medical_records_recordType_idx" ON "public"."medical_records"("recordType");

-- CreateIndex
CREATE INDEX "medical_records_createdAt_idx" ON "public"."medical_records"("createdAt");

-- CreateIndex
CREATE INDEX "medical_records_deletedAt_idx" ON "public"."medical_records"("deletedAt");

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
