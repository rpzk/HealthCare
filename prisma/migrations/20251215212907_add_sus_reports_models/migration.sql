-- CreateTable
CREATE TABLE "public"."health_units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cnesCode" TEXT,
    "address" TEXT,
    "cityId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "manager" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "staffCount" INTEGER NOT NULL DEFAULT 0,
    "beds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."daily_production_reports" (
    "id" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "healthUnitId" TEXT NOT NULL,
    "professionalId" TEXT,
    "clinicConsultations" INTEGER NOT NULL DEFAULT 0,
    "preNatalConsultations" INTEGER NOT NULL DEFAULT 0,
    "pediatricConsultations" INTEGER NOT NULL DEFAULT 0,
    "urgencyConsultations" INTEGER NOT NULL DEFAULT 0,
    "homeVisits" INTEGER NOT NULL DEFAULT 0,
    "groupActivities" INTEGER NOT NULL DEFAULT 0,
    "totalConsultations" INTEGER NOT NULL DEFAULT 0,
    "acsActive" INTEGER NOT NULL DEFAULT 0,
    "acsVisits" INTEGER NOT NULL DEFAULT 0,
    "familiesVisited" INTEGER NOT NULL DEFAULT 0,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_production_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."monthly_production_reports" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "healthUnitId" TEXT NOT NULL,
    "totalConsultations" INTEGER NOT NULL DEFAULT 0,
    "totalPatients" INTEGER NOT NULL DEFAULT 0,
    "newPatients" INTEGER NOT NULL DEFAULT 0,
    "totalFamilies" INTEGER NOT NULL DEFAULT 0,
    "populationCovered" INTEGER NOT NULL DEFAULT 0,
    "clinicConsultations" INTEGER NOT NULL DEFAULT 0,
    "preNatalConsultations" INTEGER NOT NULL DEFAULT 0,
    "pediatricConsultations" INTEGER NOT NULL DEFAULT 0,
    "urgencyConsultations" INTEGER NOT NULL DEFAULT 0,
    "consultationsUnder1" INTEGER NOT NULL DEFAULT 0,
    "consultations1to4" INTEGER NOT NULL DEFAULT 0,
    "consultations5to9" INTEGER NOT NULL DEFAULT 0,
    "consultations10to14" INTEGER NOT NULL DEFAULT 0,
    "consultations15to19" INTEGER NOT NULL DEFAULT 0,
    "consultations20to49" INTEGER NOT NULL DEFAULT 0,
    "consultations50to59" INTEGER NOT NULL DEFAULT 0,
    "consultations60plus" INTEGER NOT NULL DEFAULT 0,
    "acsCount" INTEGER NOT NULL DEFAULT 0,
    "familiesVisited" INTEGER NOT NULL DEFAULT 0,
    "homeVisits" INTEGER NOT NULL DEFAULT 0,
    "coveragePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vaccinationCoverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "preNatalCoverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pediatricCoverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "referralsIssued" INTEGER NOT NULL DEFAULT 0,
    "counterReferralsReceived" INTEGER NOT NULL DEFAULT 0,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_production_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stratified_production_reports" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "healthUnitId" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "gender" TEXT,
    "type" TEXT NOT NULL,
    "consultationCount" INTEGER NOT NULL DEFAULT 0,
    "patientCount" INTEGER NOT NULL DEFAULT 0,
    "newPatients" INTEGER NOT NULL DEFAULT 0,
    "vaccinated" INTEGER NOT NULL DEFAULT 0,
    "referrals" INTEGER NOT NULL DEFAULT 0,
    "complications" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stratified_production_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."health_situation_reports" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "healthUnitId" TEXT NOT NULL,
    "diabeticCases" INTEGER NOT NULL DEFAULT 0,
    "hypertensiveCases" INTEGER NOT NULL DEFAULT 0,
    "tuberculosisCases" INTEGER NOT NULL DEFAULT 0,
    "leprousCases" INTEGER NOT NULL DEFAULT 0,
    "hivCases" INTEGER NOT NULL DEFAULT 0,
    "syphilisCases" INTEGER NOT NULL DEFAULT 0,
    "pregnantWomen" INTEGER NOT NULL DEFAULT 0,
    "malnourishedChildren" INTEGER NOT NULL DEFAULT 0,
    "domesticViolenceCases" INTEGER NOT NULL DEFAULT 0,
    "substanceAbuseCases" INTEGER NOT NULL DEFAULT 0,
    "followedDiabetics" INTEGER NOT NULL DEFAULT 0,
    "followedHypertensive" INTEGER NOT NULL DEFAULT 0,
    "followedTuberculosis" INTEGER NOT NULL DEFAULT 0,
    "criticalRiskCases" INTEGER NOT NULL DEFAULT 0,
    "medicalEmergencies" INTEGER NOT NULL DEFAULT 0,
    "hospitalizations" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_situation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pregnancy_reports" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "healthUnitId" TEXT NOT NULL,
    "enrolledPregnancies" INTEGER NOT NULL DEFAULT 0,
    "activeFollowUps" INTEGER NOT NULL DEFAULT 0,
    "preNatalConsultations" INTEGER NOT NULL DEFAULT 0,
    "bloodPressureChecks" INTEGER NOT NULL DEFAULT 0,
    "urineTests" INTEGER NOT NULL DEFAULT 0,
    "bloodTests" INTEGER NOT NULL DEFAULT 0,
    "tetanusCoverage" INTEGER NOT NULL DEFAULT 0,
    "influenzaCoverage" INTEGER NOT NULL DEFAULT 0,
    "gestationalDiabetes" INTEGER NOT NULL DEFAULT 0,
    "preeclampsia" INTEGER NOT NULL DEFAULT 0,
    "highRiskCases" INTEGER NOT NULL DEFAULT 0,
    "referrals" INTEGER NOT NULL DEFAULT 0,
    "livebirths" INTEGER NOT NULL DEFAULT 0,
    "stillbirths" INTEGER NOT NULL DEFAULT 0,
    "maternalDeaths" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pregnancy_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pediatric_health_reports" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "healthUnitId" TEXT NOT NULL,
    "childrenUnder1" INTEGER NOT NULL DEFAULT 0,
    "childrenUnder5" INTEGER NOT NULL DEFAULT 0,
    "activeFollowUps" INTEGER NOT NULL DEFAULT 0,
    "healthConsultations" INTEGER NOT NULL DEFAULT 0,
    "growthAssessments" INTEGER NOT NULL DEFAULT 0,
    "developmentAssessments" INTEGER NOT NULL DEFAULT 0,
    "vaccinationCoverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completeCalendar" INTEGER NOT NULL DEFAULT 0,
    "incompleteCalendar" INTEGER NOT NULL DEFAULT 0,
    "breastfeedingRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "malnourished" INTEGER NOT NULL DEFAULT 0,
    "severeMalnourished" INTEGER NOT NULL DEFAULT 0,
    "neonatalTriaging" INTEGER NOT NULL DEFAULT 0,
    "developmentDeviations" INTEGER NOT NULL DEFAULT 0,
    "preventableDeaths" INTEGER NOT NULL DEFAULT 0,
    "accidents" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pediatric_health_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."epidemiology_reports" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "healthUnitId" TEXT NOT NULL,
    "diseaseCode" TEXT NOT NULL,
    "diseaseName" TEXT NOT NULL,
    "suspectedCases" INTEGER NOT NULL DEFAULT 0,
    "probableCases" INTEGER NOT NULL DEFAULT 0,
    "confirmedCases" INTEGER NOT NULL DEFAULT 0,
    "recovered" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "abandoned" INTEGER NOT NULL DEFAULT 0,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "epidemiology_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "health_units_cnesCode_key" ON "public"."health_units"("cnesCode");

-- CreateIndex
CREATE INDEX "health_units_cnesCode_idx" ON "public"."health_units"("cnesCode");

-- CreateIndex
CREATE INDEX "health_units_cityId_idx" ON "public"."health_units"("cityId");

-- CreateIndex
CREATE INDEX "health_units_isActive_idx" ON "public"."health_units"("isActive");

-- CreateIndex
CREATE INDEX "daily_production_reports_healthUnitId_idx" ON "public"."daily_production_reports"("healthUnitId");

-- CreateIndex
CREATE INDEX "daily_production_reports_reportDate_idx" ON "public"."daily_production_reports"("reportDate");

-- CreateIndex
CREATE INDEX "daily_production_reports_month_year_idx" ON "public"."daily_production_reports"("month", "year");

-- CreateIndex
CREATE INDEX "daily_production_reports_professionalId_idx" ON "public"."daily_production_reports"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_production_reports_healthUnitId_reportDate_profession_key" ON "public"."daily_production_reports"("healthUnitId", "reportDate", "professionalId");

-- CreateIndex
CREATE INDEX "monthly_production_reports_healthUnitId_idx" ON "public"."monthly_production_reports"("healthUnitId");

-- CreateIndex
CREATE INDEX "monthly_production_reports_month_year_idx" ON "public"."monthly_production_reports"("month", "year");

-- CreateIndex
CREATE INDEX "monthly_production_reports_validated_idx" ON "public"."monthly_production_reports"("validated");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_production_reports_healthUnitId_month_year_key" ON "public"."monthly_production_reports"("healthUnitId", "month", "year");

-- CreateIndex
CREATE INDEX "stratified_production_reports_healthUnitId_idx" ON "public"."stratified_production_reports"("healthUnitId");

-- CreateIndex
CREATE INDEX "stratified_production_reports_month_year_idx" ON "public"."stratified_production_reports"("month", "year");

-- CreateIndex
CREATE INDEX "stratified_production_reports_ageGroup_idx" ON "public"."stratified_production_reports"("ageGroup");

-- CreateIndex
CREATE INDEX "stratified_production_reports_type_idx" ON "public"."stratified_production_reports"("type");

-- CreateIndex
CREATE UNIQUE INDEX "stratified_production_reports_healthUnitId_month_year_ageGr_key" ON "public"."stratified_production_reports"("healthUnitId", "month", "year", "ageGroup", "gender", "type");

-- CreateIndex
CREATE INDEX "health_situation_reports_healthUnitId_idx" ON "public"."health_situation_reports"("healthUnitId");

-- CreateIndex
CREATE INDEX "health_situation_reports_month_year_idx" ON "public"."health_situation_reports"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "health_situation_reports_healthUnitId_month_year_key" ON "public"."health_situation_reports"("healthUnitId", "month", "year");

-- CreateIndex
CREATE INDEX "pregnancy_reports_healthUnitId_idx" ON "public"."pregnancy_reports"("healthUnitId");

-- CreateIndex
CREATE INDEX "pregnancy_reports_month_year_idx" ON "public"."pregnancy_reports"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "pregnancy_reports_healthUnitId_month_year_key" ON "public"."pregnancy_reports"("healthUnitId", "month", "year");

-- CreateIndex
CREATE INDEX "pediatric_health_reports_healthUnitId_idx" ON "public"."pediatric_health_reports"("healthUnitId");

-- CreateIndex
CREATE INDEX "pediatric_health_reports_month_year_idx" ON "public"."pediatric_health_reports"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "pediatric_health_reports_healthUnitId_month_year_key" ON "public"."pediatric_health_reports"("healthUnitId", "month", "year");

-- CreateIndex
CREATE INDEX "epidemiology_reports_healthUnitId_idx" ON "public"."epidemiology_reports"("healthUnitId");

-- CreateIndex
CREATE INDEX "epidemiology_reports_week_year_idx" ON "public"."epidemiology_reports"("week", "year");

-- CreateIndex
CREATE INDEX "epidemiology_reports_diseaseCode_idx" ON "public"."epidemiology_reports"("diseaseCode");

-- CreateIndex
CREATE INDEX "epidemiology_reports_notified_idx" ON "public"."epidemiology_reports"("notified");

-- CreateIndex
CREATE UNIQUE INDEX "epidemiology_reports_healthUnitId_month_year_diseaseCode_key" ON "public"."epidemiology_reports"("healthUnitId", "month", "year", "diseaseCode");

-- AddForeignKey
ALTER TABLE "public"."health_units" ADD CONSTRAINT "health_units_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_production_reports" ADD CONSTRAINT "daily_production_reports_healthUnitId_fkey" FOREIGN KEY ("healthUnitId") REFERENCES "public"."health_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_production_reports" ADD CONSTRAINT "daily_production_reports_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."monthly_production_reports" ADD CONSTRAINT "monthly_production_reports_healthUnitId_fkey" FOREIGN KEY ("healthUnitId") REFERENCES "public"."health_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stratified_production_reports" ADD CONSTRAINT "stratified_production_reports_healthUnitId_fkey" FOREIGN KEY ("healthUnitId") REFERENCES "public"."health_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."health_situation_reports" ADD CONSTRAINT "health_situation_reports_healthUnitId_fkey" FOREIGN KEY ("healthUnitId") REFERENCES "public"."health_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pregnancy_reports" ADD CONSTRAINT "pregnancy_reports_healthUnitId_fkey" FOREIGN KEY ("healthUnitId") REFERENCES "public"."health_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pediatric_health_reports" ADD CONSTRAINT "pediatric_health_reports_healthUnitId_fkey" FOREIGN KEY ("healthUnitId") REFERENCES "public"."health_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."epidemiology_reports" ADD CONSTRAINT "epidemiology_reports_healthUnitId_fkey" FOREIGN KEY ("healthUnitId") REFERENCES "public"."health_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
