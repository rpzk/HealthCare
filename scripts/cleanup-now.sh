#!/bin/bash
# 🔧 LIMPEZA MANUAL DE DADOS MOCADOS

# Este script remove dados fictícios que ainda podem estar no banco

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
echo "  ✓ Interações IA sintéticas"
echo "  ✓ Logs de auditoria antigos"
echo ""
echo "Garantia:"
echo "  ✓ Mantém dados reais intactos"
echo "  ✓ Mantém schema do banco"
echo "  ✓ Mantém estrutura de produção"
echo ""

read -p "Tem certeza? Digite 'sim' para confirmar: " confirm

if [[ "$confirm" != "sim" ]]; then
  echo "❌ Abortado."
  exit 0
fi

echo ""
echo "📊 Conectando ao banco de dados..."
echo "   Host: $DB_HOST"
echo "   Database: $DB_NAME"
echo ""

# Executar limpeza com senha
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/production-cleanup.sql 2>&1 | tail -30

echo ""
echo "✅ LIMPEZA CONCLUÍDA!"
echo ""
echo "Próximos passos:"
echo "  1. npm run build"
echo "  2. npm start"
echo ""
