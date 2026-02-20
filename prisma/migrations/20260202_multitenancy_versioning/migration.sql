-- =====================================================
-- Migration: Add Multi-tenancy, Version Control, and Sharing Models
-- Description: Adds Tenant, UserTenant, MedicalRecordVersion, 
--              MedicalRecordSignature, MedicalRecordShare, and Exam models
-- =====================================================

-- =====================================================
-- TENANT (Multi-tenancy)
-- =====================================================
CREATE TABLE IF NOT EXISTS "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logo_url" TEXT,
    "primary_color" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_key" ON "tenants"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_domain_key" ON "tenants"("domain");
CREATE INDEX IF NOT EXISTS "tenants_status_idx" ON "tenants"("status");

-- =====================================================
-- USER_TENANT (User-Tenant relationship)
-- =====================================================
CREATE TABLE IF NOT EXISTS "user_tenants" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "user_tenants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_tenants_user_tenant_unique" ON "user_tenants"("user_id", "tenant_id");
CREATE INDEX IF NOT EXISTS "user_tenants_tenant_id_idx" ON "user_tenants"("tenant_id");

-- =====================================================
-- MEDICAL_RECORD_VERSION (Version history)
-- =====================================================
CREATE TABLE IF NOT EXISTS "medical_record_versions" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "record_type" TEXT NOT NULL,
    "priority" TEXT DEFAULT 'NORMAL',
    "diagnosis" TEXT,
    "treatment" TEXT,
    "notes" TEXT,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "change_type" TEXT NOT NULL DEFAULT 'updated',
    "changes_summary" TEXT,
    
    CONSTRAINT "medical_record_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "medical_record_versions_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "medical_record_versions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "medical_record_versions_record_id_idx" ON "medical_record_versions"("medical_record_id");
CREATE INDEX IF NOT EXISTS "medical_record_versions_version_idx" ON "medical_record_versions"("medical_record_id", "version");
CREATE INDEX IF NOT EXISTS "medical_record_versions_changed_at_idx" ON "medical_record_versions"("changed_at");

-- =====================================================
-- MEDICAL_RECORD_SIGNATURE (Digital signatures)
-- =====================================================
CREATE TABLE IF NOT EXISTS "medical_record_signatures" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "signer_id" TEXT NOT NULL,
    "signature_type" TEXT NOT NULL DEFAULT 'digital',
    "certificate_id" TEXT,
    "signature_data" TEXT,
    "signature_hash" TEXT,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "validation_errors" TEXT,
    "icp_brasil_verified" BOOLEAN DEFAULT false,
    "certificate_info" JSONB,
    
    CONSTRAINT "medical_record_signatures_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "medical_record_signatures_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "medical_record_signatures_signer_id_fkey" FOREIGN KEY ("signer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    -- Note: certificate_id FK to DigitalCertificate is managed by Prisma if table exists
);

CREATE INDEX IF NOT EXISTS "medical_record_signatures_record_idx" ON "medical_record_signatures"("medical_record_id");
CREATE INDEX IF NOT EXISTS "medical_record_signatures_signer_idx" ON "medical_record_signatures"("signer_id");
CREATE INDEX IF NOT EXISTS "medical_record_signatures_signed_at_idx" ON "medical_record_signatures"("signed_at");

-- =====================================================
-- MEDICAL_RECORD_SHARE (Sharing permissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS "medical_record_shares" (
    "id" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'read',
    "granted_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    
    CONSTRAINT "medical_record_shares_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "medical_record_shares_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "medical_record_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "medical_record_shares_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "medical_record_shares_unique" ON "medical_record_shares"("medical_record_id", "user_id") WHERE "revoked_at" IS NULL;
CREATE INDEX IF NOT EXISTS "medical_record_shares_user_idx" ON "medical_record_shares"("user_id");
CREATE INDEX IF NOT EXISTS "medical_record_shares_expires_idx" ON "medical_record_shares"("expires_at") WHERE "expires_at" IS NOT NULL;

-- =====================================================
-- EXAM (Laboratory/Diagnostic exams)
-- =====================================================
CREATE TABLE IF NOT EXISTS "exams" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT,
    "exam_type" TEXT NOT NULL,
    "exam_code" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT DEFAULT 'NORMAL',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_at" TIMESTAMP(3),
    "performed_at" TIMESTAMP(3),
    "result_at" TIMESTAMP(3),
    "result" TEXT,
    "result_values" JSONB,
    "reference_values" JSONB,
    "interpretation" TEXT,
    "lab_name" TEXT,
    "lab_code" TEXT,
    "fhir_resource_id" TEXT,
    "hl7_message_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "exams_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "exams_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "exams_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "exams_patient_idx" ON "exams"("patient_id");
CREATE INDEX IF NOT EXISTS "exams_doctor_idx" ON "exams"("doctor_id");
CREATE INDEX IF NOT EXISTS "exams_status_idx" ON "exams"("status");
CREATE INDEX IF NOT EXISTS "exams_type_idx" ON "exams"("exam_type");
CREATE INDEX IF NOT EXISTS "exams_fhir_idx" ON "exams"("fhir_resource_id") WHERE "fhir_resource_id" IS NOT NULL;

-- =====================================================
-- Add tags and status to MedicalRecord (if not exists)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'tags') THEN
        ALTER TABLE "medical_records" ADD COLUMN "tags" TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'status') THEN
        ALTER TABLE "medical_records" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE';
    END IF;
END $$;

-- =====================================================
-- Add tenant_id to key tables (optional - for multi-tenancy)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'tenant_id') THEN
        ALTER TABLE "patients" ADD COLUMN "tenant_id" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
        ALTER TABLE "users" ADD COLUMN "tenant_id" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medical_records' AND column_name = 'tenant_id') THEN
        ALTER TABLE "medical_records" ADD COLUMN "tenant_id" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultations' AND column_name = 'tenant_id') THEN
        ALTER TABLE "consultations" ADD COLUMN "tenant_id" TEXT;
    END IF;
END $$;

-- =====================================================
-- Create indexes for tenant_id columns
-- =====================================================
CREATE INDEX IF NOT EXISTS "patients_tenant_idx" ON "patients"("tenant_id") WHERE "tenant_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "users_tenant_idx" ON "users"("tenant_id") WHERE "tenant_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "medical_records_tenant_idx" ON "medical_records"("tenant_id") WHERE "tenant_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "consultations_tenant_idx" ON "consultations"("tenant_id") WHERE "tenant_id" IS NOT NULL;

-- =====================================================
-- Add sus_card to patients for HL7/FHIR integration
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'sus_card') THEN
        ALTER TABLE "patients" ADD COLUMN "sus_card" TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "patients_sus_card_idx" ON "patients"("sus_card") WHERE "sus_card" IS NOT NULL;
