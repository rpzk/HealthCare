#!/bin/bash
# =====================================================
# Script de Backup Automatizado - HealthCare
# Executa backup do banco PostgreSQL
# =====================================================

set -e

# Configurações
BACKUP_DIR="/home/umbrel/backups/healthcare"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="healthcare_db"
DB_USER="healthcare"
DB_HOST="localhost"
DB_PORT="5432"
RETENTION_DAYS=30

# Carregar variáveis de ambiente (apenas as necessárias)
if [ -f "/home/umbrel/HealthCare/.env" ]; then
    POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" /home/umbrel/HealthCare/.env | cut -d'=' -f2)
fi

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

# Nome do arquivo de backup
BACKUP_FILE="$BACKUP_DIR/healthcare_${TIMESTAMP}.sql.gz"
LOG_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.log"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "🏥 HealthCare - Backup Automatizado" | tee -a "$LOG_FILE"
echo "📅 Data: $(date)" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"

# Verificar espaço em disco
DISK_AVAIL=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')
echo "💾 Espaço disponível: $DISK_AVAIL" | tee -a "$LOG_FILE"

# Executar backup
echo "📦 Iniciando backup do banco de dados..." | tee -a "$LOG_FILE"

if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    -F p 2>> "$LOG_FILE" | gzip > "$BACKUP_FILE"; then
    
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup concluído: $BACKUP_FILE" | tee -a "$LOG_FILE"
    echo "📊 Tamanho: $BACKUP_SIZE" | tee -a "$LOG_FILE"
else
    echo "❌ ERRO: Falha no backup!" | tee -a "$LOG_FILE"
    exit 1
fi

# Verificar integridade básica
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "✅ Verificação de integridade: OK" | tee -a "$LOG_FILE"
else
    echo "⚠️  Aviso: Arquivo pode estar corrompido" | tee -a "$LOG_FILE"
fi

# Limpar backups antigos
echo "🧹 Removendo backups com mais de $RETENTION_DAYS dias..." | tee -a "$LOG_FILE"
DELETED=$(find "$BACKUP_DIR" -name "healthcare_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "   Removidos: $DELETED arquivos" | tee -a "$LOG_FILE"

# Limpar logs antigos
find "$BACKUP_DIR" -name "backup_*.log" -type f -mtime +$RETENTION_DAYS -delete

# Listar backups existentes
echo "" | tee -a "$LOG_FILE"
echo "📋 Backups disponíveis:" | tee -a "$LOG_FILE"
ls -lh "$BACKUP_DIR"/healthcare_*.sql.gz 2>/dev/null | tail -5 | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "✅ Backup finalizado em $(date)" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
