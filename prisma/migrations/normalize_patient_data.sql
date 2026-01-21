-- Migração para normalizar dados de pacientes
-- Criado em: 2025-01-19
-- Objetivo: Normalizar bloodType (A_POSITIVE → A+) e preparar allergies para JSON
-- IMPORTANTE: Execute em ambiente de testes primeiro!

-- ==========================================
-- 1. NORMALIZAÇÃO DE TIPO SANGUÍNEO
-- ==========================================
-- Converter formato antigo (A_POSITIVE) para formato novo (A+)

UPDATE patients
SET "bloodType" = 'A+'
WHERE "bloodType" = 'A_POSITIVE';

UPDATE patients
SET "bloodType" = 'A-'
WHERE "bloodType" = 'A_NEGATIVE';

UPDATE patients
SET "bloodType" = 'B+'
WHERE "bloodType" = 'B_POSITIVE';

UPDATE patients
SET "bloodType" = 'B-'
WHERE "bloodType" = 'B_NEGATIVE';

UPDATE patients
SET "bloodType" = 'AB+'
WHERE "bloodType" = 'AB_POSITIVE';

UPDATE patients
SET "bloodType" = 'AB-'
WHERE "bloodType" = 'AB_NEGATIVE';

UPDATE patients
SET "bloodType" = 'O+'
WHERE "bloodType" = 'O_POSITIVE';

UPDATE patients
SET "bloodType" = 'O-'
WHERE "bloodType" = 'O_NEGATIVE';

-- ==========================================
-- 2. INFORMAÇÕES SOBRE ALLERGIES
-- ==========================================
-- NOTA: Allergies agora são armazenadas como JSON array criptografado.
-- A conversão de string para JSON deve ser feita pelo código da aplicação,
-- pois o campo está criptografado.
-- 
-- Para dados não-criptografados (se houver), o formato esperado é:
-- Antigo: "Penicilina, Látex, Dipirona"
-- Novo: ["Penicilina", "Látex", "Dipirona"] (JSON criptografado)
--
-- A lógica de conversão está implementada em:
-- - lib/patient-schemas.ts: parseAllergies() e serializeAllergies()
-- - app/api/patient/profile/route.ts: usa helpers para ler/gravar
-- - app/api/auth/register-patient/route.ts: usa helpers para criar

-- ==========================================
-- 3. VERIFICAÇÃO PÓS-MIGRAÇÃO
-- ==========================================
-- Execute estas queries para verificar a migração:

-- Verificar distribuição de tipos sanguíneos após normalização:
-- SELECT "bloodType", COUNT(*) FROM patients GROUP BY "bloodType" ORDER BY COUNT(*) DESC;

-- Verificar se ainda existem formatos antigos:
-- SELECT COUNT(*) FROM patients WHERE "bloodType" LIKE '%_%';

-- Verificar pacientes com allergies não-nulas:
-- SELECT COUNT(*) FROM patients WHERE allergies IS NOT NULL;

-- ==========================================
-- 4. ROLLBACK (se necessário)
-- ==========================================
-- CUIDADO: Apenas execute se houver problemas críticos
-- E APENAS se você fez backup antes!

-- Para reverter bloodType (não recomendado):
-- UPDATE patients SET "bloodType" = 'A_POSITIVE' WHERE "bloodType" = 'A+';
-- UPDATE patients SET "bloodType" = 'A_NEGATIVE' WHERE "bloodType" = 'A-';
-- UPDATE patients SET "bloodType" = 'B_POSITIVE' WHERE "bloodType" = 'B+';
-- UPDATE patients SET "bloodType" = 'B_NEGATIVE' WHERE "bloodType" = 'B-';
-- UPDATE patients SET "bloodType" = 'AB_POSITIVE' WHERE "bloodType" = 'AB+';
-- UPDATE patients SET "bloodType" = 'AB_NEGATIVE' WHERE "bloodType" = 'AB-';
-- UPDATE patients SET "bloodType" = 'O_POSITIVE' WHERE "bloodType" = 'O+';
-- UPDATE patients SET "bloodType" = 'O_NEGATIVE' WHERE "bloodType" = 'O-';
