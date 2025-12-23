#!/bin/bash

# ============================================================================
# PRODUCTION DATABASE CLEANUP SCRIPT
# ============================================================================
# Este script limpa o banco de dados removendo todos os dados mocados/fictícios
# Mantém apenas dados reais e a estrutura essencial para produção
# ============================================================================

set -e

echo "🔒 AVISO: Este script limpará dados fictícios do banco de dados"
echo "   Certifique-se de ter um backup antes de continuar!"
read -p "Continuar? (sim/não): " confirm

if [[ "$confirm" != "sim" ]]; then
  echo "Abortado."
  exit 0
fi

# Verificar se o banco está rodando
if ! command -v psql &> /dev/null; then
  echo "❌ psql não encontrado. Instale PostgreSQL client."
  exit 1
fi

# Configuração do banco
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-healthcare}"
DB_NAME="${DB_NAME:-healthcare_db}"
DB_PORT="${DB_PORT:-5432}"

echo "📊 Conectando ao banco de dados..."

# Limpar dados fictícios mantendo estrutura
CLEANUP_SQL=$(cat <<'EOF'
-- ============================================================================
-- LIMPEZA DE DADOS FICCIONAIS PARA PRODUÇÃO
-- ============================================================================

BEGIN;

-- Remover dados de demonstração
DELETE FROM "Consultation" WHERE "chiefComplaint" LIKE '%demo%' OR "chiefComplaint" LIKE '%teste%' OR "chiefComplaint" LIKE '%mock%';
DELETE FROM "MedicalRecord" WHERE "title" LIKE '%demo%' OR "title" LIKE '%teste%' OR "description" LIKE '%demo%';
DELETE FROM "Prescription" WHERE "medication" LIKE '%demo%' OR "medication" LIKE '%teste%';
DELETE FROM "ExamRequest" WHERE "examType" LIKE '%demo%' OR "examType" LIKE '%teste%';
DELETE FROM "VitalSigns" WHERE "bloodGlucose" > 500 OR "systolicBP" > 300;

-- Remover pacientes de testes comuns
DELETE FROM "Patient" 
WHERE "name" IN (
  'Ana Paula Silva', 'Carlos Silva', 'Maria Santos', 'Pedro Martins',
  'Paciente Teste', 'Paciente Demo', 'Test Patient', 'Demo Patient',
  'Paciente Mock', 'Maria Mock'
) OR "email" LIKE '%@test%' OR "email" LIKE '%@demo%' OR "email" LIKE '%mock%';

-- Remover contas de demonstração
DELETE FROM "User" 
WHERE "email" IN ('demo@healthcare.com', 'test@healthcare.com')
OR "email" LIKE '%@test%' OR "email" LIKE '%@demo%';

-- Remover interações de IA de teste
DELETE FROM "AIInteraction" WHERE "metadata" ->> 'synthetic' = 'true';

-- Remover análises de IA de teste
DELETE FROM "AIAnalysis" WHERE "notes" LIKE '%demo%' OR "notes" LIKE '%teste%' OR "notes" LIKE '%synthetic%';

-- Remover documentos de teste
DELETE FROM "Document" WHERE "filename" LIKE '%test%' OR "filename" LIKE '%demo%' OR "filename" LIKE '%mock%';

-- Limpar logs antigos (mantém últimos 30 dias)
DELETE FROM "AuditLog" WHERE "createdAt" < NOW() - INTERVAL '30 days';

COMMIT;

-- Verificação final
SELECT 
  'Pacientes' as tabela, COUNT(*) as registros FROM "Patient"
UNION ALL
SELECT 'Consultas', COUNT(*) FROM "Consultation"
UNION ALL
SELECT 'Prontuários', COUNT(*) FROM "MedicalRecord"
UNION ALL
SELECT 'Prescrições', COUNT(*) FROM "Prescription"
UNION ALL
SELECT 'Exames', COUNT(*) FROM "ExamRequest"
ORDER BY tabela;
EOF
)

# Executar limpeza
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<< "$CLEANUP_SQL"

echo ""
echo "✅ LIMPEZA CONCLUÍDA"
echo "📋 Dados fictícios foram removidos"
echo "🔐 Sistema pronto para produção com dados reais"
echo ""
echo "PRÓXIMOS PASSOS:"
echo "1. Validar que apenas dados reais permanecem no banco"
echo "2. Executar: npm run db:migrate:deploy"
echo "3. Executar: npm run build"
echo "4. Fazer deploy em produção"
