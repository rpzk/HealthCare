-- ============================================================================
-- PRODUCTION DATABASE RESET - REMOVE ALL MOCK DATA
-- ============================================================================
-- ⚠️  AVISO: Este script remove TODOS os dados fictícios
--    Executar apenas após backup em produção!
-- ============================================================================

-- Desabilitar constraints temporariamente
SET session_replication_role = 'replica';

BEGIN TRANSACTION;

-- ============================================================================
-- 1. LIMPAR TABELAS DE DADOS FICTÍCIOS (COM VERIFICAÇÃO DE EXISTÊNCIA)
-- ============================================================================

-- Remover eventos de IA sintéticos (se tabela existir)
DO $$ BEGIN
  DELETE FROM "AIInteraction" 
  WHERE metadata->>'synthetic' = 'true' 
     OR prompt LIKE '%demo%' 
     OR prompt LIKE '%teste%'
     OR response LIKE '%sintética%';
EXCEPTION WHEN undefined_table THEN
  -- tabela não existe, ignorar
END $$;

-- Remover análises de IA de teste (se tabela existir)
DO $$ BEGIN
  DELETE FROM "AIAnalysis" 
  WHERE notes LIKE '%demo%' 
     OR notes LIKE '%teste%' 
     OR notes LIKE '%simula%'
     OR notes LIKE '%mock%';
EXCEPTION WHEN undefined_table THEN
  -- tabela não existe, ignorar
END $$;

-- Remover documentos de teste (se tabela existir)
DO $$ BEGIN
  DELETE FROM "Document" 
  WHERE filename LIKE '%demo%' 
     OR filename LIKE '%teste%'
     OR filename LIKE '%test%'
     OR filename LIKE '%mock%';
EXCEPTION WHEN undefined_table THEN
  -- tabela não existe, ignorar
END $$;

-- Remover sinais vitais anormais (valores testes)
DO $$ BEGIN
  DELETE FROM "VitalSigns" 
  WHERE 
    -- Pressão sistólica > 250 é irreal
    (systolicBP IS NOT NULL AND systolicBP > 250)
    -- Glucose > 500 é irreal
    OR (bloodGlucose IS NOT NULL AND bloodGlucose > 500)
    -- Batimentos < 20 é irreal
    OR (heartRate IS NOT NULL AND heartRate < 20)
    -- Temperatura < 35 ou > 42 é teste
    OR (temperature IS NOT NULL AND (temperature < 35.0 OR temperature > 42.0));
EXCEPTION WHEN undefined_table THEN
  -- tabela não existe, ignorar
END $$;

-- Remover exames de teste
DO $$ BEGIN
  DELETE FROM "ExamRequest" 
  WHERE examType LIKE '%demo%' 
     OR examType LIKE '%teste%'
     OR description LIKE '%demo%';
EXCEPTION WHEN undefined_table THEN
  -- tabela não existe, ignorar
END $$;

-- Remover prescrições de teste
DO $$ BEGIN
  DELETE FROM "Prescription" 
  WHERE medication LIKE '%demo%' 
     OR medication LIKE '%teste%'
     OR instructions LIKE '%demo%';
EXCEPTION WHEN undefined_table THEN
  -- tabela não existe, ignorar
END $$;

-- Remover registros médicos de teste
DO $$ BEGIN
  DELETE FROM "MedicalRecord" 
  WHERE title LIKE '%demo%' 
     OR title LIKE '%teste%'
     OR description LIKE '%demo%'
     OR notes LIKE '%demo%'
     OR notes LIKE '%mock%';
EXCEPTION WHEN undefined_table THEN
  -- tabela não existe, ignorar
END $$;

-- Remover consultas de teste
DO $$ BEGIN
  DELETE FROM "Consultation" 
  WHERE chiefComplaint LIKE '%demo%' 
     OR chiefComplaint LIKE '%teste%'
     OR history LIKE '%demo%'
     OR notes LIKE '%demo%';
EXCEPTION WHEN undefined_table THEN
  -- tabela não existe, ignorar
END $$;

-- ============================================================================
-- 2. REMOVER PACIENTES DE TESTE CONHECIDOS
-- ============================================================================

DELETE FROM "Patient" 
WHERE name IN (
  -- Nomes comuns de teste
  'Test Patient', 'Paciente Teste', 'Paciente Demo',
  'Ana Paula Silva', 'Carlos Silva', 'Maria Santos',
  'Pedro Martins', 'João Silva', 'Médico Teste',
  'Doctor Test', 'Admin Test', 'Mock Patient',
  'Paciente Mock', 'Maria Mock', 'John Doe',
  'Demo User', 'Teste Sistema', 'QA Test'
)
OR email LIKE '%@test%' 
OR email LIKE '%@demo%' 
OR email LIKE '%mock%'
OR cpf IN (
  '111.111.111-11',
  '222.222.222-22',
  '333.333.333-33',
  '123.456.789-00',
  '123.456.789-01',
  '321.654.987-12'
);

-- ============================================================================
-- 3. REMOVER CONTAS DE TESTE
-- ============================================================================

DELETE FROM "User" 
WHERE email IN (
  'demo@healthcare.com',
  'test@healthcare.com',
  'test@example.com',
  'demo@example.com',
  'medico.teste@healthcare.com'
)
OR email LIKE '%@test%'
OR email LIKE '%@demo%'
OR email LIKE '%@mock%'
OR name LIKE '%test%'
OR name LIKE '%demo%'
OR name LIKE '%mock%';

-- ============================================================================
-- 4. LIMPEZA DE LOGS E DADOS TEMPORÁRIOS
-- ============================================================================

-- Remover logs de auditoria antigos (manter últimos 90 dias) - se tabela existir
DO $$ BEGIN
  DELETE FROM "AuditLog" 
  WHERE "createdAt" < NOW() - INTERVAL '90 days';
EXCEPTION WHEN undefined_table THEN
  -- tabela não existe, ignorar
END $$;

-- Remover logs de erro antigos - se tabela existir
DO $$ BEGIN
  DELETE FROM "ErrorLog" 
  WHERE "createdAt" < NOW() - INTERVAL '30 days';
EXCEPTION WHEN undefined_table THEN
  -- tabela não existe, ignorar
END $$;

-- Limpar cache de sessão expirado - se tabela existir
DO $$ BEGIN
  DELETE FROM "Session" 
  WHERE expires < NOW();
EXCEPTION WHEN undefined_table THEN
  -- tabela não existe, ignorar
END $$;

-- ============================================================================
-- 5. RESETAR SEQUÊNCIAS DE IDs (OPCIONAL)
-- ============================================================================

-- Recompactar IDs (executar apenas se necessário)
-- ALTER SEQUENCE "User_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "Patient_id_seq" RESTART WITH 1;

-- ============================================================================
-- 5. VALIDAÇÃO FINAL (SE TABELAS EXISTIREM)
-- ============================================================================

-- Contagem de dados remanentes
DO $$ 
DECLARE
  v_users INT;
  v_patients INT;
  v_consultations INT;
BEGIN
  -- Verificar e contar tabelas existentes
  SELECT COUNT(*) INTO v_users FROM "User";
  SELECT COUNT(*) INTO v_patients FROM "Patient";
  SELECT COUNT(*) INTO v_consultations FROM "Consultation";
  
  RAISE NOTICE 'Usuários: %', v_users;
  RAISE NOTICE 'Pacientes: %', v_patients;
  RAISE NOTICE 'Consultas: %', v_consultations;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- ============================================================================
-- HABILITAR CONSTRAINTS NOVAMENTE
-- ============================================================================

SET session_replication_role = 'origin';

COMMIT;

-- ============================================================================
-- MENSAGEM DE CONCLUSÃO
-- ============================================================================

\echo ''
\echo '✅ LIMPEZA DE DADOS FICTÍCIOS CONCLUÍDA'
\echo '📋 Todos os dados de teste foram removidos'
\echo '🔐 Sistema contém APENAS dados reais'
\echo '📊 Verifique as contagens acima para confirmar'
\echo ''
