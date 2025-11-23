/*
  Warnings:

  - A unique constraint covering the columns `[personId]` on the table `patients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[patientId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."Role" ADD VALUE 'PHYSIOTHERAPIST';
ALTER TYPE "public"."Role" ADD VALUE 'PSYCHOLOGIST';
ALTER TYPE "public"."Role" ADD VALUE 'HEALTH_AGENT';
ALTER TYPE "public"."Role" ADD VALUE 'TECHNICIAN';
ALTER TYPE "public"."Role" ADD VALUE 'PHARMACIST';
ALTER TYPE "public"."Role" ADD VALUE 'DENTIST';
ALTER TYPE "public"."Role" ADD VALUE 'NUTRITIONIST';
ALTER TYPE "public"."Role" ADD VALUE 'SOCIAL_WORKER';
ALTER TYPE "public"."Role" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "public"."patients" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "licenseState" TEXT,
ADD COLUMN     "licenseType" TEXT,
ADD COLUMN     "patientId" TEXT;

-- CreateTable
CREATE TABLE "public"."people" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "socialName" TEXT,
    "cpf" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" "public"."Gender",
    "motherName" TEXT,
    "fatherName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "ethnicity" TEXT,
    "educationLevel" TEXT,
    "occupation" TEXT,
    "nationality" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."person_addresses" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'RESIDENTIAL',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "person_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."professionals" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "registryNumber" TEXT,
    "councilNumber" TEXT,
    "councilType" TEXT,
    "councilState" TEXT,
    "cbo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."territories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parentId" TEXT,
    "geometry" JSONB,
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "level" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "territories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "people_cpf_key" ON "public"."people"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "people_userId_key" ON "public"."people"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "person_addresses_personId_addressId_key" ON "public"."person_addresses"("personId", "addressId");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_personId_key" ON "public"."professionals"("personId");

-- CreateIndex
CREATE INDEX "territories_type_idx" ON "public"."territories"("type");

-- CreateIndex
CREATE INDEX "territories_parentId_idx" ON "public"."territories"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_personId_key" ON "public"."patients"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "users_patientId_key" ON "public"."users"("patientId");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."people" ADD CONSTRAINT "people_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."person_addresses" ADD CONSTRAINT "person_addresses_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."person_addresses" ADD CONSTRAINT "person_addresses_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."professionals" ADD CONSTRAINT "professionals_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patients" ADD CONSTRAINT "patients_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."territories" ADD CONSTRAINT "territories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
