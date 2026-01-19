-- CreateEnum
CREATE TYPE "public"."ExternalSourceType" AS ENUM ('ICD10', 'ICD11', 'CIAP2', 'NURSING', 'CBO');

-- CreateTable
CREATE TABLE "public"."external_source_updates" (
    "id" TEXT NOT NULL,
    "sourceType" "public"."ExternalSourceType" NOT NULL,
    "versionTag" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "insertedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT,
    "errorMessage" TEXT,
    "meta" TEXT,

    CONSTRAINT "external_source_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_source_updates_sourceType_startedAt_idx" ON "public"."external_source_updates"("sourceType", "startedAt");
