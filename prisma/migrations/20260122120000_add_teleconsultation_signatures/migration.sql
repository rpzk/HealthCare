-- CreateTable
CREATE TABLE "public"."teleconsultation_signatures" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teleconsultation_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teleconsultation_signatures_consultationId_idx" ON "public"."teleconsultation_signatures"("consultationId");

-- CreateIndex
CREATE INDEX "teleconsultation_signatures_signerId_idx" ON "public"."teleconsultation_signatures"("signerId");

-- AddForeignKey
ALTER TABLE "public"."teleconsultation_signatures" ADD CONSTRAINT "teleconsultation_signatures_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
