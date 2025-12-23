-- CreateTable
CREATE TABLE "public"."IntegrationLog" (
    "id" TEXT NOT NULL,
    "integrationName" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestPayload" TEXT NOT NULL,
    "responseData" TEXT NOT NULL,
    "externalProtocolId" TEXT,
    "externalReference" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationLog_certificateId_idx" ON "public"."IntegrationLog"("certificateId");

-- CreateIndex
CREATE INDEX "IntegrationLog_integrationName_idx" ON "public"."IntegrationLog"("integrationName");

-- CreateIndex
CREATE INDEX "IntegrationLog_status_idx" ON "public"."IntegrationLog"("status");

-- CreateIndex
CREATE INDEX "IntegrationLog_submittedAt_idx" ON "public"."IntegrationLog"("submittedAt");
