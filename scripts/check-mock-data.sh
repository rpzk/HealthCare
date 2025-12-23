#!/bin/bash
# 🔍 RELATÓRIO DE DADOS MOCADOS NO BANCO

# Este script mostra quantos dados mocados ainda estão no banco

DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-healthcare}"
DB_NAME="${DB_NAME:-healthcare_db}"
DB_PORT="${DB_PORT:-5432}"
DB_PASSWORD="${DB_PASSWORD:-umbrel_secure_pass}"

echo "🔍 RELATÓRIO DE DADOS MOCADOS"
echo "======================================"
echo ""

# Executar queries para encontrar dados mock com senha
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF' 2>/dev/null || echo "⚠️  Não foi possível conectar ao banco"

\echo '📊 PACIENTES DE TESTE'
\echo '────────────────────────────'
SELECT COUNT(*) as "Total de Pacientes de Teste",
       STRING_AGG(name, ', ') as "Nomes"
FROM "Patient"
WHERE name IN (
  'Ana Paula Silva', 'Carlos Silva', 'Maria Santos', 'Pedro Martins',
  'Paciente Teste', 'Paciente Demo', 'Test Patient', 'Demo Patient',
  'Paciente Mock', 'Maria Mock', 'John Doe', 'Médico Teste',
  'Doctor Test', 'Admin Test', 'Mock Patient'
) OR email LIKE '%@test%' OR email LIKE '%@demo%';

\echo ''
\echo '👤 CONTAS DE TESTE'
\echo '────────────────────────────'
SELECT COUNT(*) as "Total",
       STRING_AGG(email, ', ') as "Emails"
FROM "User"
WHERE email LIKE '%@test%' OR email LIKE '%@demo%' OR email LIKE '%mock%';

\echo ''
\echo '🤖 DADOS DE IA SINTÉTICOS'
\echo '────────────────────────────'
SELECT COUNT(*) as "Total"
FROM "AIInteraction"
WHERE metadata->>'synthetic' = 'true';

\echo ''
\echo '📋 CONSULTAS DE TESTE'
\echo '────────────────────────────'
SELECT COUNT(*) as "Total"
FROM "Consultation"
WHERE chiefComplaint LIKE '%demo%' OR chiefComplaint LIKE '%teste%';

\echo ''
\echo '💊 PRESCRIÇÕES DE TESTE'
\echo '────────────────────────────'
SELECT COUNT(*) as "Total"
FROM "Prescription"
WHERE medication LIKE '%demo%' OR medication LIKE '%teste%';

\echo ''
\echo '🔬 EXAMES DE TESTE'
\echo '────────────────────────────'
SELECT COUNT(*) as "Total"
FROM "ExamRequest"
WHERE examType LIKE '%demo%' OR examType LIKE '%teste%';

\echo ''
\echo '✅ RESUMO'
\echo '────────────────────────────'
SELECT 
  'Pacientes' as item, COUNT(*) as total FROM "Patient"
UNION ALL
SELECT 'Consultas', COUNT(*) FROM "Consultation"
UNION ALL
SELECT 'Prontuários', COUNT(*) FROM "MedicalRecord"
UNION ALL
SELECT 'Prescrições', COUNT(*) FROM "Prescription"
UNION ALL
SELECT 'Exames', COUNT(*) FROM "ExamRequest"
ORDER BY total DESC;

EOF

echo ""
echo "Se encontrou dados acima, execute: bash scripts/cleanup-now.sh"
