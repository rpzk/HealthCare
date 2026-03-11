-- AlterTable (safe: table may not exist if model was removed)
DO $$ BEGIN
  ALTER TABLE "patient_invites" ADD COLUMN "allergies" TEXT,
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "emergencyContact" TEXT;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;
