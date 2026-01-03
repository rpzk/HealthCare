/*
  Warnings:

  - You are about to drop the column `isAvailable` on the `schedule_exceptions` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."BlockType" AS ENUM ('UNAVAILABLE', 'ON_CALL', 'VACATION', 'SICK_LEAVE', 'MAINTENANCE', 'TRAINING', 'MEETING');

-- CreateEnum
CREATE TYPE "public"."ScheduleServiceType" AS ENUM ('IN_PERSON', 'REMOTE', 'BOTH');

-- CreateEnum
CREATE TYPE "public"."ScheduleApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ScheduleRequestType" AS ENUM ('ADD_HOURS', 'REMOVE_HOURS', 'MODIFY_HOURS', 'BLOCK_DATES', 'UNBLOCK_DATES', 'CHANGE_SERVICE_TYPE');

-- AlterTable
ALTER TABLE "public"."DigitalCertificate" ADD COLUMN     "pfxFilePath" TEXT,
ADD COLUMN     "pfxPasswordHash" TEXT;

-- AlterTable
ALTER TABLE "public"."doctor_schedules" ADD COLUMN     "allowPatientBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoConfirmBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxBookingDaysAhead" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "minBookingHoursAhead" INTEGER NOT NULL DEFAULT 24;

-- AlterTable
ALTER TABLE "public"."schedule_exceptions" DROP COLUMN "isAvailable",
ADD COLUMN     "blockType" "public"."BlockType" NOT NULL DEFAULT 'UNAVAILABLE';

-- CreateTable
CREATE TABLE "public"."clinic_schedules" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."professional_schedules" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "serviceType" "public"."ScheduleServiceType" NOT NULL DEFAULT 'BOTH',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "public"."ScheduleApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedule_change_requests" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "requestType" "public"."ScheduleRequestType" NOT NULL,
    "requestData" JSONB NOT NULL,
    "reason" TEXT,
    "status" "public"."ScheduleApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedule_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "color" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinic_schedules_clinicId_idx" ON "public"."clinic_schedules"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_schedules_clinicId_dayOfWeek_key" ON "public"."clinic_schedules"("clinicId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "professional_schedules_professionalId_dayOfWeek_idx" ON "public"."professional_schedules"("professionalId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "professional_schedules_status_idx" ON "public"."professional_schedules"("status");

-- CreateIndex
CREATE INDEX "schedule_change_requests_professionalId_idx" ON "public"."schedule_change_requests"("professionalId");

-- CreateIndex
CREATE INDEX "schedule_change_requests_status_idx" ON "public"."schedule_change_requests"("status");

-- CreateIndex
CREATE INDEX "schedule_change_requests_requestType_idx" ON "public"."schedule_change_requests"("requestType");

-- CreateIndex
CREATE INDEX "schedule_templates_isGlobal_idx" ON "public"."schedule_templates"("isGlobal");

-- CreateIndex
CREATE INDEX "schedule_templates_createdBy_idx" ON "public"."schedule_templates"("createdBy");

-- CreateIndex
CREATE INDEX "schedule_exceptions_doctorId_date_idx" ON "public"."schedule_exceptions"("doctorId", "date");

-- AddForeignKey
ALTER TABLE "public"."professional_schedules" ADD CONSTRAINT "professional_schedules_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."professional_schedules" ADD CONSTRAINT "professional_schedules_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."professional_schedules" ADD CONSTRAINT "professional_schedules_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_change_requests" ADD CONSTRAINT "schedule_change_requests_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_change_requests" ADD CONSTRAINT "schedule_change_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_change_requests" ADD CONSTRAINT "schedule_change_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_templates" ADD CONSTRAINT "schedule_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
