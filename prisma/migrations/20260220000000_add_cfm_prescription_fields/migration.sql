-- AlterEnum
-- Substituir o enum PrescriptionType antigo pelo novo (CFM-compliant)
ALTER TYPE "PrescriptionType" RENAME TO "PrescriptionType_old";

CREATE TYPE "PrescriptionType" AS ENUM (
  'SIMPLE',
  'ANTIMICROBIAL',
  'CONTROLLED_A',
  'CONTROLLED_B',
  'CONTROLLED_C1',
  'CONTROLLED_C4',
  'CONTROLLED_C5'
);

-- AlterTable prescriptions - Adicionar novos campos CFM/ANVISA
ALTER TABLE "prescriptions" 
  ADD COLUMN IF NOT EXISTS "prescriptionType" "PrescriptionType" NOT NULL DEFAULT 'SIMPLE',
  ADD COLUMN IF NOT EXISTS "controlNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "uf" VARCHAR(2),
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "buyerName" TEXT,
  ADD COLUMN IF NOT EXISTS "buyerDocument" TEXT,
  ADD COLUMN IF NOT EXISTS "buyerAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "buyerPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "dispensedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pharmacyName" TEXT,
  ADD COLUMN IF NOT EXISTS "pharmacyCnpj" TEXT,
  ADD COLUMN IF NOT EXISTS "pharmacistName" TEXT,
  ADD COLUMN IF NOT EXISTS "pharmacistCrf" TEXT,
  ADD COLUMN IF NOT EXISTS "viaNumber" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "justification" TEXT,
  ADD COLUMN IF NOT EXISTS "requiresSecondCopy" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "hasRestrictedQuantity" BOOLEAN NOT NULL DEFAULT false;

-- Criar índices para os novos campos
CREATE UNIQUE INDEX IF NOT EXISTS "prescriptions_controlNumber_key" ON "prescriptions"("controlNumber");
CREATE INDEX IF NOT EXISTS "prescriptions_prescriptionType_idx" ON "prescriptions"("prescriptionType");
CREATE INDEX IF NOT EXISTS "prescriptions_expiresAt_idx" ON "prescriptions"("expiresAt");

-- AlterTable medications - Atualizar campo prescriptionType
-- Migrar dados antigos para novos valores (mapping razoável)
ALTER TABLE "medications" DROP COLUMN IF EXISTS "prescriptionType";
ALTER TABLE "medications" ADD COLUMN "prescriptionType" "PrescriptionType" NOT NULL DEFAULT 'SIMPLE';

-- AlterTable prescription_items - Adicionar novos campos CFM obrigatórios
ALTER TABLE "prescription_items" 
  ADD COLUMN IF NOT EXISTS "medicationName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "concentration" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "pharmaceuticalForm" TEXT,
  ADD COLUMN IF NOT EXISTS "quantityInWords" TEXT,
  ADD COLUMN IF NOT EXISTS "administrationRoute" TEXT DEFAULT 'oral',
  ADD COLUMN IF NOT EXISTS "usageType" TEXT DEFAULT 'internal';

-- Popular campos obrigatórios com dados existentes (migration de dados)
UPDATE "prescription_items" 
SET 
  "medicationName" = COALESCE("customName", 'Medicamento não especificado'),
  "concentration" = "dosage",
  "quantity" = COALESCE("quantity", 1)
WHERE "medicationName" = '' OR "medicationName" IS NULL;

-- Atualizar registros NULL para quantity ANTES de tornar NOT NULL
UPDATE "prescription_items" SET "quantity" = 1 WHERE "quantity" IS NULL;

-- Fazer quantity NOT NULL (era nullable)
ALTER TABLE "prescription_items" ALTER COLUMN "quantity" SET NOT NULL;
ALTER TABLE "prescription_items" ALTER COLUMN "quantity" SET DEFAULT 1;

-- Remover o enum antigo
DROP TYPE IF EXISTS "PrescriptionType_old";
