/*
  Warnings:

  - A unique constraint covering the columns `[counterReferralId]` on the table `referrals` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."CertificateType" ADD VALUE 'SHIFT_LEAVE';
ALTER TYPE "public"."CertificateType" ADD VALUE 'MUNICIPAL_TRANSPORT';
ALTER TYPE "public"."CertificateType" ADD VALUE 'INTERSTATE_TRANSPORT';
ALTER TYPE "public"."CertificateType" ADD VALUE 'MEDICAL_EVALUATION';
ALTER TYPE "public"."CertificateType" ADD VALUE 'MATERNITY_LEAVE';
ALTER TYPE "public"."CertificateType" ADD VALUE 'ADDITIONAL';
ALTER TYPE "public"."CertificateType" ADD VALUE 'PERIODIC_EXAM';
ALTER TYPE "public"."CertificateType" ADD VALUE 'DISMISSAL_EXAM';
ALTER TYPE "public"."CertificateType" ADD VALUE 'HEALTH_CERTIFICATE';

-- AlterTable
ALTER TABLE "public"."referrals" ADD COLUMN     "attendedDate" TIMESTAMP(3),
ADD COLUMN     "consultationId" TEXT,
ADD COLUMN     "counterReferralId" TEXT,
ADD COLUMN     "destinationDoctorId" TEXT,
ADD COLUMN     "destinationUnitId" TEXT,
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "outcomeNotes" TEXT,
ADD COLUMN     "scheduledDate" TIMESTAMP(3),
ADD COLUMN     "urgencyLevel" TEXT;

-- AlterTable
ALTER TABLE "public"."vital_signs" ADD COLUMN     "armCircumference" DOUBLE PRECISION,
ADD COLUMN     "bmiClassification" TEXT,
ADD COLUMN     "bmiForAge" TEXT,
ADD COLUMN     "breastfeeding" TEXT,
ADD COLUMN     "headCircumference" DOUBLE PRECISION,
ADD COLUMN     "heightForAge" TEXT,
ADD COLUMN     "hipCircumference" DOUBLE PRECISION,
ADD COLUMN     "nutritionalStatus" TEXT,
ADD COLUMN     "waistCircumference" DOUBLE PRECISION,
ADD COLUMN     "weightForAge" TEXT;

-- CreateTable
CREATE TABLE "public"."vaccines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "manufacturer" TEXT,
    "diseasesCovered" TEXT[],
    "dosesRequired" INTEGER NOT NULL,
    "intervalDays" INTEGER,
    "boosterRequired" BOOLEAN NOT NULL DEFAULT false,
    "boosterAfterMonths" INTEGER,
    "ageGroups" TEXT[],
    "minAgeMonths" INTEGER,
    "maxAgeMonths" INTEGER,
    "description" TEXT,
    "contraindications" TEXT,
    "sideEffects" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pniIncluded" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vaccinations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "vaccineId" TEXT NOT NULL,
    "applicationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doseNumber" INTEGER NOT NULL,
    "lot" TEXT,
    "expiryDate" TIMESTAMP(3),
    "healthUnitId" TEXT,
    "professionalId" TEXT,
    "adverseReaction" BOOLEAN NOT NULL DEFAULT false,
    "reactionDetails" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vaccine_schedule_entries" (
    "id" TEXT NOT NULL,
    "vaccineId" TEXT NOT NULL,
    "ageMonths" INTEGER NOT NULL,
    "ageLabel" TEXT NOT NULL,
    "doseNumber" INTEGER NOT NULL,
    "doseType" TEXT NOT NULL,
    "description" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccine_schedule_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prenatal_consultations" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "pregnancyId" TEXT,
    "trimester" INTEGER NOT NULL,
    "gestationalAge" INTEGER,
    "uterineHeight" INTEGER,
    "fetalHeartRate" INTEGER,
    "fetalMovements" BOOLEAN,
    "syphilisTest" BOOLEAN NOT NULL DEFAULT false,
    "vdrlTest" BOOLEAN NOT NULL DEFAULT false,
    "urineTest" BOOLEAN NOT NULL DEFAULT false,
    "glucoseTest" BOOLEAN NOT NULL DEFAULT false,
    "hemoglobinTest" BOOLEAN NOT NULL DEFAULT false,
    "hematocritTest" BOOLEAN NOT NULL DEFAULT false,
    "hivTest" BOOLEAN NOT NULL DEFAULT false,
    "hepatitisBTest" BOOLEAN NOT NULL DEFAULT false,
    "toxoplasmosisTest" BOOLEAN NOT NULL DEFAULT false,
    "testResults" JSONB,
    "tetanusDose1" BOOLEAN NOT NULL DEFAULT false,
    "tetanusDose2" BOOLEAN NOT NULL DEFAULT false,
    "tetanusBooster" BOOLEAN NOT NULL DEFAULT false,
    "tetanusImmune" BOOLEAN NOT NULL DEFAULT false,
    "influenzaVaccine" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" TEXT,
    "riskFactors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gestationalDiabetes" BOOLEAN NOT NULL DEFAULT false,
    "preeclampsia" BOOLEAN NOT NULL DEFAULT false,
    "hemorrhage" BOOLEAN NOT NULL DEFAULT false,
    "prematureLabor" BOOLEAN NOT NULL DEFAULT false,
    "nutritionalGuidance" BOOLEAN NOT NULL DEFAULT false,
    "physicalActivity" BOOLEAN NOT NULL DEFAULT false,
    "breastfeedingPrep" BOOLEAN NOT NULL DEFAULT false,
    "nextConsultDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prenatal_consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pregnancies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "estimatedDueDate" TIMESTAMP(3) NOT NULL,
    "lastMenstrualPeriod" TIMESTAMP(3),
    "gestationalAge" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "gravidity" INTEGER,
    "parity" INTEGER,
    "abortions" INTEGER,
    "cesareans" INTEGER,
    "deliveryDate" TIMESTAMP(3),
    "deliveryType" TEXT,
    "deliveryLocation" TEXT,
    "birthWeight" DOUBLE PRECISION,
    "birthLength" DOUBLE PRECISION,
    "apgarScore1min" INTEGER,
    "apgarScore5min" INTEGER,
    "outcome" TEXT,
    "postpartumVisit" BOOLEAN NOT NULL DEFAULT false,
    "complications" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pregnancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gynecological_history" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consultationId" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventType" TEXT NOT NULL,
    "ageAtEvent" INTEGER,
    "contraceptionMethod" TEXT,
    "contraceptionStartDate" TIMESTAMP(3),
    "contraceptionEndDate" TIMESTAMP(3),
    "description" TEXT,
    "clinicalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gynecological_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vaccines_code_key" ON "public"."vaccines"("code");

-- CreateIndex
CREATE INDEX "vaccines_code_idx" ON "public"."vaccines"("code");

-- CreateIndex
CREATE INDEX "vaccines_active_idx" ON "public"."vaccines"("active");

-- CreateIndex
CREATE INDEX "vaccines_pniIncluded_idx" ON "public"."vaccines"("pniIncluded");

-- CreateIndex
CREATE INDEX "vaccinations_patientId_idx" ON "public"."vaccinations"("patientId");

-- CreateIndex
CREATE INDEX "vaccinations_vaccineId_idx" ON "public"."vaccinations"("vaccineId");

-- CreateIndex
CREATE INDEX "vaccinations_applicationDate_idx" ON "public"."vaccinations"("applicationDate");

-- CreateIndex
CREATE INDEX "vaccinations_healthUnitId_idx" ON "public"."vaccinations"("healthUnitId");

-- CreateIndex
CREATE INDEX "vaccinations_status_idx" ON "public"."vaccinations"("status");

-- CreateIndex
CREATE INDEX "vaccine_schedule_entries_vaccineId_idx" ON "public"."vaccine_schedule_entries"("vaccineId");

-- CreateIndex
CREATE INDEX "vaccine_schedule_entries_ageMonths_idx" ON "public"."vaccine_schedule_entries"("ageMonths");

-- CreateIndex
CREATE UNIQUE INDEX "vaccine_schedule_entries_vaccineId_ageMonths_doseNumber_key" ON "public"."vaccine_schedule_entries"("vaccineId", "ageMonths", "doseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "prenatal_consultations_consultationId_key" ON "public"."prenatal_consultations"("consultationId");

-- CreateIndex
CREATE INDEX "prenatal_consultations_pregnancyId_idx" ON "public"."prenatal_consultations"("pregnancyId");

-- CreateIndex
CREATE INDEX "prenatal_consultations_consultationId_idx" ON "public"."prenatal_consultations"("consultationId");

-- CreateIndex
CREATE INDEX "prenatal_consultations_trimester_idx" ON "public"."prenatal_consultations"("trimester");

-- CreateIndex
CREATE INDEX "prenatal_consultations_riskLevel_idx" ON "public"."prenatal_consultations"("riskLevel");

-- CreateIndex
CREATE INDEX "pregnancies_patientId_idx" ON "public"."pregnancies"("patientId");

-- CreateIndex
CREATE INDEX "pregnancies_status_idx" ON "public"."pregnancies"("status");

-- CreateIndex
CREATE INDEX "pregnancies_estimatedDueDate_idx" ON "public"."pregnancies"("estimatedDueDate");

-- CreateIndex
CREATE INDEX "gynecological_history_patientId_idx" ON "public"."gynecological_history"("patientId");

-- CreateIndex
CREATE INDEX "gynecological_history_consultationId_idx" ON "public"."gynecological_history"("consultationId");

-- CreateIndex
CREATE INDEX "gynecological_history_eventType_idx" ON "public"."gynecological_history"("eventType");

-- CreateIndex
CREATE INDEX "gynecological_history_eventDate_idx" ON "public"."gynecological_history"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_counterReferralId_key" ON "public"."referrals"("counterReferralId");

-- CreateIndex
CREATE INDEX "referrals_consultationId_idx" ON "public"."referrals"("consultationId");

-- CreateIndex
CREATE INDEX "referrals_destinationUnitId_idx" ON "public"."referrals"("destinationUnitId");

-- CreateIndex
CREATE INDEX "referrals_scheduledDate_idx" ON "public"."referrals"("scheduledDate");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "public"."referrals"("status");

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_destinationUnitId_fkey" FOREIGN KEY ("destinationUnitId") REFERENCES "public"."health_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_destinationDoctorId_fkey" FOREIGN KEY ("destinationDoctorId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_counterReferralId_fkey" FOREIGN KEY ("counterReferralId") REFERENCES "public"."referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vaccinations" ADD CONSTRAINT "vaccinations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vaccinations" ADD CONSTRAINT "vaccinations_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "public"."vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vaccinations" ADD CONSTRAINT "vaccinations_healthUnitId_fkey" FOREIGN KEY ("healthUnitId") REFERENCES "public"."health_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vaccinations" ADD CONSTRAINT "vaccinations_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vaccine_schedule_entries" ADD CONSTRAINT "vaccine_schedule_entries_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "public"."vaccines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prenatal_consultations" ADD CONSTRAINT "prenatal_consultations_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prenatal_consultations" ADD CONSTRAINT "prenatal_consultations_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "public"."pregnancies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pregnancies" ADD CONSTRAINT "pregnancies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gynecological_history" ADD CONSTRAINT "gynecological_history_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gynecological_history" ADD CONSTRAINT "gynecological_history_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
