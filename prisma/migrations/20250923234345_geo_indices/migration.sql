-- CreateIndex
CREATE INDEX "addresses_microAreaId_idx" ON "public"."addresses"("microAreaId");

-- CreateIndex
CREATE INDEX "addresses_latitude_longitude_idx" ON "public"."addresses"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "micro_areas_centroidLat_centroidLng_idx" ON "public"."micro_areas"("centroidLat", "centroidLng");

-- CreateIndex
CREATE INDEX "places_microAreaId_idx" ON "public"."places"("microAreaId");

-- CreateIndex
CREATE INDEX "places_latitude_longitude_idx" ON "public"."places"("latitude", "longitude");
