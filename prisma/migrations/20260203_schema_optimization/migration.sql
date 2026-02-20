-- Migration: Schema Optimization Phase 2
-- Date: 2026-02-03
-- Removes 28 unused models and related tables
-- Total: 106 → 78 models (-26%)

-- =====================================================
-- FASE 1: Modelos completamente isolados
-- =====================================================
DROP TABLE IF EXISTS "job_stratum_profiles" CASCADE;
DROP TABLE IF EXISTS "device_readings" CASCADE;
DROP TABLE IF EXISTS "medication_takings" CASCADE;
DROP TABLE IF EXISTS "AuditAlert" CASCADE;

-- =====================================================
-- FASE 2: Módulo Inventário (não utilizado)
-- =====================================================
DROP TABLE IF EXISTS "inventory_movements" CASCADE;
DROP TABLE IF EXISTS "inventory" CASCADE;
DROP TABLE IF EXISTS "storage_locations" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;

-- =====================================================
-- FASE 3: Hierarquia Geográfica (mantido apenas Territory)
-- =====================================================
DROP TABLE IF EXISTS "neighborhoods" CASCADE;
DROP TABLE IF EXISTS "subprefectures" CASCADE;
DROP TABLE IF EXISTS "districts" CASCADE;
DROP TABLE IF EXISTS "zones" CASCADE;
DROP TABLE IF EXISTS "cities" CASCADE;
DROP TABLE IF EXISTS "states" CASCADE;
DROP TABLE IF EXISTS "countries" CASCADE;

-- =====================================================
-- FASE 4: Módulo HR/Stratum (não utilizado)
-- =====================================================
DROP TABLE IF EXISTS "stratum_assessments" CASCADE;
DROP TABLE IF EXISTS "stratum_questions" CASCADE;
DROP TABLE IF EXISTS "capability_evaluations" CASCADE;
DROP TABLE IF EXISTS "development_plans" CASCADE;
DROP TABLE IF EXISTS "schedule_entries" CASCADE;
DROP TABLE IF EXISTS "work_schedules" CASCADE;
DROP TABLE IF EXISTS "leave_requests" CASCADE;
DROP TABLE IF EXISTS "user_job_roles" CASCADE;
DROP TABLE IF EXISTS "job_roles" CASCADE;

-- =====================================================
-- FASE 5: Modelos consolidados/removidos
-- =====================================================
DROP TABLE IF EXISTS "professionals" CASCADE;
DROP TABLE IF EXISTS "households" CASCADE;
DROP TABLE IF EXISTS "resources" CASCADE;

-- =====================================================
-- Remover colunas órfãs
-- =====================================================
ALTER TABLE "patients" DROP COLUMN IF EXISTS "householdId";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "isHeadOfHousehold";

ALTER TABLE "addresses" DROP COLUMN IF EXISTS "countryId";
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "stateId";
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "cityId";
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "zoneId";
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "districtId";
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "subprefectureId";
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "neighborhoodId";

-- Remove HealthUnit cityId se existir
ALTER TABLE "health_units" DROP COLUMN IF EXISTS "cityId";

-- Remove Area neighborhoodId se existir
ALTER TABLE "areas" DROP COLUMN IF EXISTS "neighborhoodId";

-- =====================================================
-- Estatísticas finais
-- =====================================================
-- Modelos removidos: 28
-- Linhas de schema: 4276 → 3280 (-23%)
-- Modelos finais: 78

