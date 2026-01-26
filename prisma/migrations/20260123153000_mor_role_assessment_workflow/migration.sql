-- RO/SST: organizational reporting line + MoR validation workflow

-- Users: add manager relationship (managerUserId -> users.id)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "managerUserId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_managerUserId_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_managerUserId_fkey"
      FOREIGN KEY ("managerUserId")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_managerUserId_idx" ON "users"("managerUserId");

-- Stratum Assessments: link role assessments to JobRole and capture MoR validation
ALTER TABLE "stratum_assessments" ADD COLUMN IF NOT EXISTS "jobRoleId" TEXT;
ALTER TABLE "stratum_assessments" ADD COLUMN IF NOT EXISTS "morUserId" TEXT;
ALTER TABLE "stratum_assessments" ADD COLUMN IF NOT EXISTS "morValidatedAt" TIMESTAMP(3);
ALTER TABLE "stratum_assessments" ADD COLUMN IF NOT EXISTS "morEvidence" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stratum_assessments_jobRoleId_fkey'
  ) THEN
    ALTER TABLE "stratum_assessments"
      ADD CONSTRAINT "stratum_assessments_jobRoleId_fkey"
      FOREIGN KEY ("jobRoleId")
      REFERENCES "job_roles"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stratum_assessments_morUserId_fkey'
  ) THEN
    ALTER TABLE "stratum_assessments"
      ADD CONSTRAINT "stratum_assessments_morUserId_fkey"
      FOREIGN KEY ("morUserId")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "stratum_assessments_jobRoleId_status_idx" ON "stratum_assessments"("jobRoleId", "status");
CREATE INDEX IF NOT EXISTS "stratum_assessments_morUserId_morValidatedAt_idx" ON "stratum_assessments"("morUserId", "morValidatedAt");
