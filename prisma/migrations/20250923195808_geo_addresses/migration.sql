-- DropIndex
DROP INDEX "public"."patients_cpf_key";

-- CreateTable
CREATE TABLE "public"."addresses" (
    "id" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT,
    "microAreaId" TEXT,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."places" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "addressId" TEXT,
    "microAreaId" TEXT,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."micro_areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "polygonGeo" TEXT,
    "centroidLat" DOUBLE PRECISION,
    "centroidLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "micro_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_quota_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_quota_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "addresses_patientId_idx" ON "public"."addresses"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "micro_areas_code_key" ON "public"."micro_areas"("code");

-- CreateIndex
CREATE INDEX "ai_quota_usage_type_date_idx" ON "public"."ai_quota_usage"("type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ai_quota_usage_userId_type_date_key" ON "public"."ai_quota_usage"("userId", "type", "date");

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."addresses" ADD CONSTRAINT "addresses_microAreaId_fkey" FOREIGN KEY ("microAreaId") REFERENCES "public"."micro_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."places" ADD CONSTRAINT "places_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."places" ADD CONSTRAINT "places_microAreaId_fkey" FOREIGN KEY ("microAreaId") REFERENCES "public"."micro_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
