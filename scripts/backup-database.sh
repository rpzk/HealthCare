#!/bin/bash

# ============================================
# DATABASE BACKUP SCRIPT
# Auto-executa antes de migrações Prisma
# ============================================

set -e

BACKUP_DIR="/home/umbrel/backups/healthcare"
DB_NAME="healthcare_db"
DB_USER="healthcare"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/healthcare_${TIMESTAMP}.sql.gz"
LOG_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.log"

echo "🔄 Iniciando backup do banco de dados..." | tee "$LOG_FILE"
echo "Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "Arquivo: $BACKUP_FILE" | tee -a "$LOG_FILE"

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

# Fazer backup
echo "⏳ Executando pg_dump..." | tee -a "$LOG_FILE"
if docker exec healthcare-db pg_dump -U $DB_USER -d $DB_NAME --verbose 2>&1 | gzip > "$BACKUP_FILE"; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup concluído com sucesso!" | tee -a "$LOG_FILE"
    echo "📦 Tamanho: $FILE_SIZE" | tee -a "$LOG_FILE"
    
    # Contar registros principais
    echo "" | tee -a "$LOG_FILE"
    echo "📊 Resumo de Dados:" | tee -a "$LOG_FILE"
    
    PATIENT_COUNT=$(docker exec healthcare-db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM patients;" 2>/dev/null || echo "0")
    QUESTIONNAIRE_COUNT=$(docker exec healthcare-db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM patient_questionnaires;" 2>/dev/null || echo "0")
    CONSULTATION_COUNT=$(docker exec healthcare-db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM consultations WHERE status NOT IN ('CANCELLED');" 2>/dev/null || echo "0")
    USER_COUNT=$(docker exec healthcare-db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
    
    echo "  👥 Pacientes: $PATIENT_COUNT" | tee -a "$LOG_FILE"
    echo "  📋 Questionários: $QUESTIONNAIRE_COUNT" | tee -a "$LOG_FILE"
    echo "  📅 Agendamentos: $CONSULTATION_COUNT" | tee -a "$LOG_FILE"
    echo "  👤 Usuários: $USER_COUNT" | tee -a "$LOG_FILE"
    
    echo "" | tee -a "$LOG_FILE"
    echo "⚠️  ANTES DE FAZER RESET DO BANCO:" | tee -a "$LOG_FILE"
    echo "  ✅ Backup salvo em: $BACKUP_FILE" | tee -a "$LOG_FILE"
    echo "  ✅ Para restaurar, execute:" | tee -a "$LOG_FILE"
    echo "     gunzip -c $BACKUP_FILE | docker exec -i healthcare-db psql -U $DB_USER -d $DB_NAME" | tee -a "$LOG_FILE"
    
else
    echo "❌ ERRO ao fazer backup!" | tee -a "$LOG_FILE"
    exit 1
fi

echo "✅ Backup completo!" | tee -a "$LOG_FILE"
