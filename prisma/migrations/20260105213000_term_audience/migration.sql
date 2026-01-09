-- Add audience to terms so we can separate patient/professional documents

DO $$
BEGIN
  CREATE TYPE "TermAudience" AS ENUM ('ALL', 'PATIENT', 'PROFESSIONAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "terms"
  ADD COLUMN IF NOT EXISTS "audience" "TermAudience" NOT NULL DEFAULT 'ALL';
