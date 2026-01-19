-- Add cpfHash column and adjust constraints
ALTER TABLE "patients" ADD COLUMN "cpfHash" TEXT;
-- Remove existing unique on cpf if exists (ignore errors)
DO $$ BEGIN
  ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "patients_cpf_key";
EXCEPTION WHEN others THEN NULL; END $$;
-- Create unique index on cpfHash
CREATE UNIQUE INDEX IF NOT EXISTS "patients_cpfHash_key" ON "patients"("cpfHash");
