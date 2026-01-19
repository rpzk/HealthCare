/*
  Warnings:

  - You are about to drop the column `bloodType` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `chronicDiseases` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `doctorId` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `rg` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `patients` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `patients` table. All the data in the column will be lost.
  - Made the column `email` on table `patients` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DocumentFileType" AS ENUM ('DOCX', 'DOC', 'PDF', 'TXT', 'RTF');

-- CreateEnum
CREATE TYPE "DocumentProcessStatus" AS ENUM ('PENDING', 'ANALYZING', 'CLASSIFIED', 'IMPORTED', 'ERROR');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('EVOLUCAO', 'EXAME', 'PRESCRICAO', 'ANAMNESE', 'ATESTADO', 'RECEITA', 'LAUDO', 'OUTROS');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('BAIXO', 'MEDIO', 'ALTO', 'CRITICO');

-- DropForeignKey
ALTER TABLE "patients" DROP CONSTRAINT "patients_doctorId_fkey";

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "patientId" TEXT;

-- AlterTable
ALTER TABLE "medical_records" ADD COLUMN     "sourceDocument" TEXT;

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "bloodType",
DROP COLUMN "chronicDiseases",
DROP COLUMN "city",
DROP COLUMN "doctorId",
DROP COLUMN "isActive",
DROP COLUMN "rg",
DROP COLUMN "state",
DROP COLUMN "zipCode",
ADD COLUMN     "currentMedications" TEXT,
ADD COLUMN     "insuranceNumber" TEXT,
ADD COLUMN     "medicalHistory" TEXT,
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL DEFAULT 'BAIXO',
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "cpf" DROP NOT NULL,
ALTER COLUMN "allergies" DROP NOT NULL,
ALTER COLUMN "allergies" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "medical_documents" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileType" "DocumentFileType" NOT NULL,
    "status" "DocumentProcessStatus" NOT NULL DEFAULT 'PENDING',
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,
    "importResults" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT,

    CONSTRAINT "medical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_analysis" (
    "id" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "patientInfo" TEXT NOT NULL,
    "extractedData" TEXT NOT NULL,
    "suggestedActions" TEXT NOT NULL,
    "analysisDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "documentId" TEXT NOT NULL,

    CONSTRAINT "document_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_results" (
    "id" TEXT NOT NULL,
    "examType" TEXT NOT NULL,
    "results" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "sourceDocument" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT NOT NULL,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_analysis_documentId_key" ON "document_analysis"("documentId");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_analysis" ADD CONSTRAINT "document_analysis_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "medical_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
