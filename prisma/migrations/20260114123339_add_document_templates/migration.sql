-- AlterTable
ALTER TABLE "branding" ADD COLUMN     "clinicAddress" TEXT,
ADD COLUMN     "clinicCity" TEXT,
ADD COLUMN     "clinicPhone" TEXT,
ADD COLUMN     "clinicState" TEXT,
ADD COLUMN     "clinicZipCode" TEXT;

-- AlterTable
ALTER TABLE "consultations" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "patient_invites" ADD COLUMN     "assignedDoctorId" TEXT;

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "description" TEXT,
    "htmlTemplate" TEXT NOT NULL,
    "cssTemplate" TEXT,
    "config" JSONB,
    "signaturePosition" TEXT,
    "signatureSize" TEXT,
    "qrcodePosition" TEXT,
    "qrcodeSize" TEXT,
    "showQrcode" BOOLEAN NOT NULL DEFAULT true,
    "clinicName" BOOLEAN NOT NULL DEFAULT true,
    "clinicLogo" BOOLEAN NOT NULL DEFAULT true,
    "clinicAddress" BOOLEAN NOT NULL DEFAULT true,
    "clinicPhone" BOOLEAN NOT NULL DEFAULT true,
    "doctorName" BOOLEAN NOT NULL DEFAULT true,
    "doctorSpec" BOOLEAN NOT NULL DEFAULT true,
    "doctorCRM" BOOLEAN NOT NULL DEFAULT true,
    "doctorAddress" BOOLEAN NOT NULL DEFAULT false,
    "doctorLogo" BOOLEAN NOT NULL DEFAULT false,
    "showFooter" BOOLEAN NOT NULL DEFAULT true,
    "footerText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT,
    "pdfUrl" TEXT,
    "signedHash" TEXT,
    "signedDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_templates_documentType_idx" ON "document_templates"("documentType");

-- CreateIndex
CREATE INDEX "document_templates_createdBy_idx" ON "document_templates"("createdBy");

-- CreateIndex
CREATE INDEX "document_templates_isActive_idx" ON "document_templates"("isActive");

-- CreateIndex
CREATE INDEX "document_templates_isDefault_idx" ON "document_templates"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "generated_documents_signedDocumentId_key" ON "generated_documents"("signedDocumentId");

-- CreateIndex
CREATE INDEX "generated_documents_templateId_idx" ON "generated_documents"("templateId");

-- CreateIndex
CREATE INDEX "generated_documents_documentType_documentId_idx" ON "generated_documents"("documentType", "documentId");

-- CreateIndex
CREATE INDEX "generated_documents_doctorId_idx" ON "generated_documents"("doctorId");

-- CreateIndex
CREATE INDEX "generated_documents_patientId_idx" ON "generated_documents"("patientId");

-- CreateIndex
CREATE INDEX "generated_documents_createdAt_idx" ON "generated_documents"("createdAt");

-- CreateIndex
CREATE INDEX "patient_invites_assignedDoctorId_idx" ON "patient_invites"("assignedDoctorId");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_signedDocumentId_fkey" FOREIGN KEY ("signedDocumentId") REFERENCES "SignedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_invites" ADD CONSTRAINT "patient_invites_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
