#!/bin/bash
# =====================================================
# Script de Restore - HealthCare
# Restaura backup do banco PostgreSQL
# =====================================================

set -e

# Configurações
DB_NAME="healthcare_db"
DB_USER="healthcare"
DB_HOST="localhost"
DB_PORT="5432"
BACKUP_DIR="/home/umbrel/backups/healthcare"

# Carregar variáveis de ambiente
if [ -f "/home/umbrel/HealthCare/.env" ]; then
    POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" /home/umbrel/HealthCare/.env | cut -d'=' -f2)
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 HealthCare - Restauração de Backup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se foi passado arquivo
if [ -z "$1" ]; then
    echo "📋 Backups disponíveis:"
    echo ""
    ls -lh "$BACKUP_DIR"/healthcare_*.sql.gz 2>/dev/null | while read line; do
        echo "   $line"
    done
    echo ""
    echo "Uso: $0 <arquivo_backup.sql.gz>"
    echo "Exemplo: $0 $BACKUP_DIR/healthcare_20251202_020000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Erro: Arquivo não encontrado: $BACKUP_FILE"
    exit 1
fi

# Verificar integridade
echo "🔍 Verificando integridade do backup..."
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "❌ Erro: Arquivo de backup está corrompido!"
    exit 1
fi
echo "✅ Arquivo íntegro"

# Confirmação
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo "⚠️  ATENÇÃO: Esta operação irá:"
echo "   - Apagar TODOS os dados atuais do banco"
echo "   - Restaurar dados do arquivo: $(basename $BACKUP_FILE)"
echo "   - Tamanho do backup: $BACKUP_SIZE"
echo ""
read -p "Deseja continuar? (digite 'RESTAURAR' para confirmar): " CONFIRM

if [ "$CONFIRM" != "RESTAURAR" ]; then
    echo "❌ Operação cancelada."
    exit 1
fi

echo ""
echo "📦 Iniciando restauração..."

# Parar aplicação (se estiver rodando via PM2 ou systemd)
if command -v pm2 &> /dev/null; then
    echo "⏸️  Parando aplicação..."
    pm2 stop healthcare 2>/dev/null || true
fi

# Restaurar
echo "🔄 Restaurando banco de dados..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --quiet \
    2>&1

# Reiniciar aplicação
if command -v pm2 &> /dev/null; then
    echo "▶️  Reiniciando aplicação..."
    pm2 start healthcare 2>/dev/null || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Restauração concluída com sucesso!"
echo "📅 $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
