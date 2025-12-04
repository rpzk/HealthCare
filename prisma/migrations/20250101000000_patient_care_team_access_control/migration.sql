-- CreateEnum
CREATE TYPE "CareTeamAccessLevel" AS ENUM ('FULL', 'CONSULTATION', 'LIMITED', 'EMERGENCY', 'VIEW_ONLY');

-- CreateTable
CREATE TABLE "patient_care_team" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessLevel" "CareTeamAccessLevel" NOT NULL DEFAULT 'CONSULTATION',
    "addedById" TEXT,
    "reason" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_care_team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_care_team_patient" ON "patient_care_team"("patientId");

-- CreateIndex
CREATE INDEX "idx_care_team_user" ON "patient_care_team"("userId");

-- CreateIndex
CREATE INDEX "idx_care_team_access" ON "patient_care_team"("accessLevel");

-- CreateIndex
CREATE INDEX "idx_care_team_active" ON "patient_care_team"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "patient_care_team_patientId_userId_key" ON "patient_care_team"("patientId", "userId");

-- AddForeignKey
ALTER TABLE "patient_care_team" ADD CONSTRAINT "patient_care_team_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_care_team" ADD CONSTRAINT "patient_care_team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_care_team" ADD CONSTRAINT "patient_care_team_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
