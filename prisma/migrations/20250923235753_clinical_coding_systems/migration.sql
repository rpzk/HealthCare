-- CreateEnum
CREATE TYPE "public"."CodeSystemKind" AS ENUM ('CID10', 'CID11', 'CIAP2', 'NURSING');

-- CreateEnum
CREATE TYPE "public"."DiagnosisStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'ENTERED_IN_ERROR', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."DiagnosisCertainty" AS ENUM ('SUSPECTED', 'PROBABLE', 'CONFIRMED', 'RULED_OUT');

-- CreateTable
CREATE TABLE "public"."code_systems" (
    "id" TEXT NOT NULL,
    "kind" "public"."CodeSystemKind" NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."medical_codes" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "synonyms" TEXT,
    "searchableText" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."diagnoses" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consultationId" TEXT,
    "primaryCodeId" TEXT NOT NULL,
    "status" "public"."DiagnosisStatus" NOT NULL DEFAULT 'ACTIVE',
    "certainty" "public"."DiagnosisCertainty" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "onsetDate" TIMESTAMP(3),
    "resolvedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."diagnosis_secondary_codes" (
    "id" TEXT NOT NULL,
    "diagnosisId" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnosis_secondary_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "code_systems_kind_version_key" ON "public"."code_systems"("kind", "version");

-- CreateIndex
CREATE INDEX "medical_codes_code_idx" ON "public"."medical_codes"("code");

-- CreateIndex
CREATE INDEX "medical_codes_display_idx" ON "public"."medical_codes"("display");

-- CreateIndex
CREATE UNIQUE INDEX "medical_codes_systemId_code_key" ON "public"."medical_codes"("systemId", "code");

-- CreateIndex
CREATE INDEX "diagnoses_patientId_idx" ON "public"."diagnoses"("patientId");

-- CreateIndex
CREATE INDEX "diagnoses_consultationId_idx" ON "public"."diagnoses"("consultationId");

-- CreateIndex
CREATE INDEX "diagnosis_secondary_codes_codeId_idx" ON "public"."diagnosis_secondary_codes"("codeId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_secondary_codes_diagnosisId_codeId_key" ON "public"."diagnosis_secondary_codes"("diagnosisId", "codeId");

-- AddForeignKey
ALTER TABLE "public"."medical_codes" ADD CONSTRAINT "medical_codes_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "public"."code_systems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medical_codes" ADD CONSTRAINT "medical_codes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."medical_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnoses" ADD CONSTRAINT "diagnoses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnoses" ADD CONSTRAINT "diagnoses_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnoses" ADD CONSTRAINT "diagnoses_primaryCodeId_fkey" FOREIGN KEY ("primaryCodeId") REFERENCES "public"."medical_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnosis_secondary_codes" ADD CONSTRAINT "diagnosis_secondary_codes_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "public"."diagnoses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diagnosis_secondary_codes" ADD CONSTRAINT "diagnosis_secondary_codes_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "public"."medical_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
