-- CreateTable
CREATE TABLE "public"."diagnosis_revisions" (
    "id" TEXT NOT NULL,
    "diagnosisId" TEXT NOT NULL,
    "previous" JSONB,
    "next" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" TEXT,
    "reason" TEXT,

    CONSTRAINT "diagnosis_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diagnosis_revisions_diagnosisId_changedAt_idx" ON "public"."diagnosis_revisions"("diagnosisId", "changedAt");

-- AddForeignKey
ALTER TABLE "public"."diagnosis_revisions" ADD CONSTRAINT "diagnosis_revisions_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "public"."diagnoses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
