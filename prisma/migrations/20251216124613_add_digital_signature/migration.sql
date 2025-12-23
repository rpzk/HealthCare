-- AlterTable
ALTER TABLE "public"."MedicalCertificate" ADD COLUMN     "signature" TEXT,
ADD COLUMN     "signatureMethod" TEXT NOT NULL DEFAULT 'NONE';
