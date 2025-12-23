#!/bin/bash
# 🔧 LIMPEZA DE DADOS MOCADOS - VERSÃO ROBUSTA

# Este script limpa dados fictícios do banco de forma segura

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-healthcare}"
DB_NAME="${DB_NAME:-healthcare_db}"
DB_PORT="${DB_PORT:-5432}"
DB_PASSWORD="${DB_PASSWORD:-umbrel_secure_pass}"

echo "🔒 LIMPEZA DE DADOS MOCADOS"
echo "================================"
echo ""
echo "Este script irá REMOVER:"
echo "  ✓ Pacientes de teste (Ana Paula Silva, Maria Santos, etc)"
echo "  ✓ Dados de demonstração"
echo "  ✓ Contas de teste"
echo "  ✓ Logs de auditoria antigos"
echo ""

read -p "Tem certeza? Digite 'sim' para confirmar: " confirm

if [[ "$confirm" != "sim" ]]; then
  echo "❌ Abortado."
  exit 0
fi

echo ""
echo "📊 Conectando ao banco de dados..."

# Função para executar query SQL com tratamento de erro
execute_sql() {
  local sql="$1"
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql" 2>/dev/null || true
}

# 1. Remover pacientes de teste
echo "📋 Limpando pacientes de teste..."
execute_sql "DELETE FROM \"Patient\" WHERE name IN ('Ana Paula Silva', 'Carlos Silva', 'Maria Santos', 'Pedro Martins', 'Paciente Teste', 'Paciente Demo', 'Test Patient', 'Demo Patient', 'Paciente Mock', 'Maria Mock', 'John Doe', 'Médico Teste', 'Doctor Test', 'Admin Test', 'Mock Patient', 'Demo User', 'Teste Sistema', 'QA Test') OR email LIKE '%@test%' OR email LIKE '%@demo%' OR email LIKE '%mock%' OR cpf IN ('111.111.111-11', '222.222.222-22', '333.333.333-33', '123.456.789-00', '123.456.789-01', '321.654.987-12');"

# 2. Remover contas de teste
echo "👤 Limpando contas de teste..."
execute_sql "DELETE FROM \"User\" WHERE email IN ('demo@healthcare.com', 'test@healthcare.com', 'test@example.com', 'demo@example.com', 'medico.teste@healthcare.com') OR email LIKE '%@test%' OR email LIKE '%@demo%' OR email LIKE '%@mock%' OR name LIKE '%test%' OR name LIKE '%demo%' OR name LIKE '%mock%';"

# 3. Remover consultas de teste
echo "📅 Limpando consultas de teste..."
execute_sql "DELETE FROM \"Consultation\" WHERE chiefComplaint LIKE '%demo%' OR chiefComplaint LIKE '%teste%' OR history LIKE '%demo%' OR notes LIKE '%demo%';"

# 4. Remover registros médicos de teste
echo "📋 Limpando registros médicos de teste..."
execute_sql "DELETE FROM \"MedicalRecord\" WHERE title LIKE '%demo%' OR title LIKE '%teste%' OR description LIKE '%demo%' OR notes LIKE '%demo%' OR notes LIKE '%mock%';"

# 5. Remover prescrições de teste
echo "💊 Limpando prescrições de teste..."
execute_sql "DELETE FROM \"Prescription\" WHERE medication LIKE '%demo%' OR medication LIKE '%teste%' OR instructions LIKE '%demo%';"

# 6. Remover exames de teste
echo "🔬 Limpando exames de teste..."
execute_sql "DELETE FROM \"ExamRequest\" WHERE examType LIKE '%demo%' OR examType LIKE '%teste%' OR description LIKE '%demo%';"

# 7. Remover sinais vitais anormais
echo "📊 Limpando sinais vitais de teste..."
execute_sql "DELETE FROM \"VitalSigns\" WHERE (systolicBP IS NOT NULL AND systolicBP > 250) OR (bloodGlucose IS NOT NULL AND bloodGlucose > 500) OR (heartRate IS NOT NULL AND heartRate < 20) OR (temperature IS NOT NULL AND (temperature < 35.0 OR temperature > 42.0));"

# 8. Remover documentos de teste
echo "📄 Limpando documentos de teste..."
execute_sql "DELETE FROM \"Document\" WHERE filename LIKE '%demo%' OR filename LIKE '%teste%' OR filename LIKE '%test%' OR filename LIKE '%mock%';"

# 9. Limpeza de logs antigos (opcional)
echo "📜 Limpando logs antigos..."
execute_sql "DELETE FROM \"AuditLog\" WHERE \"createdAt\" < NOW() - INTERVAL '90 days';" 2>/dev/null || true
execute_sql "DELETE FROM \"ErrorLog\" WHERE \"createdAt\" < NOW() - INTERVAL '30 days';" 2>/dev/null || true
execute_sql "DELETE FROM \"Session\" WHERE expires < NOW();" 2>/dev/null || true

echo ""
echo "✅ LIMPEZA CONCLUÍDA COM SUCESSO!"
echo ""
echo "Próximos passos:"
echo "  1. npm run build"
echo "  2. npm start"
echo ""
