-- Restore patient_invites (removed in 20260202_schema_cleanup while UI still depended on it)

CREATE TABLE IF NOT EXISTS "patient_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "patientName" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "assignedDoctorId" TEXT,
    "birthDate" TIMESTAMP(3),
    "cpf" TEXT,
    "allergies" TEXT,
    "gender" "Gender",
    "emergencyContact" TEXT,
    "customMessage" TEXT,
    "consentAcceptedAt" TIMESTAMP(3),
    "consentIpAddress" TEXT,
    "consentUserAgent" TEXT,
    "patientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "patient_invites_token_key" ON "patient_invites"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "patient_invites_patientId_key" ON "patient_invites"("patientId");
CREATE INDEX IF NOT EXISTS "patient_invites_email_idx" ON "patient_invites"("email");
CREATE INDEX IF NOT EXISTS "patient_invites_token_idx" ON "patient_invites"("token");
CREATE INDEX IF NOT EXISTS "patient_invites_assignedDoctorId_idx" ON "patient_invites"("assignedDoctorId");

DO $$ BEGIN
  ALTER TABLE "patient_invites" ADD CONSTRAINT "patient_invites_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "patient_invites" ADD CONSTRAINT "patient_invites_assignedDoctorId_fkey"
    FOREIGN KEY ("assignedDoctorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "patient_invites" ADD CONSTRAINT "patient_invites_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "patient_biometric_consents" ADD CONSTRAINT "patient_biometric_consents_inviteId_fkey"
    FOREIGN KEY ("inviteId") REFERENCES "patient_invites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
