-- AlterTable
ALTER TABLE "public"."micro_areas" ADD COLUMN     "maxLat" DOUBLE PRECISION,
ADD COLUMN     "maxLng" DOUBLE PRECISION,
ADD COLUMN     "minLat" DOUBLE PRECISION,
ADD COLUMN     "minLng" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "public"."micro_area_revisions" (
    "id" TEXT NOT NULL,
    "microAreaId" TEXT NOT NULL,
    "previousGeo" TEXT,
    "newGeo" TEXT,
    "changedByUser" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "micro_area_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "micro_area_revisions_microAreaId_createdAt_idx" ON "public"."micro_area_revisions"("microAreaId", "createdAt");

-- CreateIndex
CREATE INDEX "micro_areas_minLat_maxLat_idx" ON "public"."micro_areas"("minLat", "maxLat");

-- CreateIndex
CREATE INDEX "micro_areas_minLng_maxLng_idx" ON "public"."micro_areas"("minLng", "maxLng");

-- AddForeignKey
ALTER TABLE "public"."micro_area_revisions" ADD CONSTRAINT "micro_area_revisions_microAreaId_fkey" FOREIGN KEY ("microAreaId") REFERENCES "public"."micro_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
