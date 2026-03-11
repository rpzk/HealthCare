-- Remover RENAMEMedication: PrescriptionItem e tabela
ALTER TABLE "prescription_items" DROP CONSTRAINT IF EXISTS "prescription_items_renameMedicationId_fkey";
ALTER TABLE "prescription_items" DROP COLUMN IF EXISTS "renameMedicationId";
DROP TABLE IF EXISTS "rename_medications";
