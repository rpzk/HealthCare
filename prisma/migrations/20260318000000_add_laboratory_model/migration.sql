-- ============================================================
-- Migration: add_laboratory_model
-- Adds the Laboratory entity for HL7/FHIR integration auth.
-- Adds laboratoryId + tenantId to exams table.
-- ============================================================

-- CreateTable
CREATE TABLE "laboratories" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "apiKeyHash"  TEXT NOT NULL,
    "active"      BOOLEAN NOT NULL DEFAULT true,
    "tenantId"    TEXT,
    "allowedIps"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laboratories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "laboratories_code_key" ON "laboratories"("code");
CREATE INDEX "laboratories_code_idx"     ON "laboratories"("code");
CREATE INDEX "laboratories_active_idx"   ON "laboratories"("active");
CREATE INDEX "laboratories_tenantId_idx" ON "laboratories"("tenantId");

-- AlterTable: add laboratoryId and tenantId to exams
ALTER TABLE "exams" ADD COLUMN "laboratoryId" TEXT;
ALTER TABLE "exams" ADD COLUMN "tenantId"     TEXT;

-- CreateIndex on exams
CREATE INDEX "exams_laboratoryId_idx" ON "exams"("laboratoryId");
CREATE INDEX "exams_tenantId_idx"     ON "exams"("tenantId");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_laboratoryId_fkey"
    FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
