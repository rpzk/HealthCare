#!/bin/bash

# ============================================
# DATABASE BACKUP SCRIPT
# Auto-executa antes de migrações Prisma
# Inclui: banco + certificados digitais
# ============================================

set -e

BACKUP_DIR="/home/umbrel/backups/healthcare"
DB_NAME="healthcare_db"
DB_USER="healthcare"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/healthcare_${TIMESTAMP}.sql.gz"
LOG_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.log"
CERTS_DIR="$BACKUP_DIR/certs_${TIMESTAMP}"

echo "🔄 Iniciando backup do banco de dados..." | tee "$LOG_FILE"
echo "Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "Arquivo: $BACKUP_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

# ============================================
# PARTE 1: Backup do Banco de Dados
# ============================================
echo "📊 [1/3] Fazendo backup do banco de dados..." | tee -a "$LOG_FILE"
echo "⏳ Executando pg_dump..." | tee -a "$LOG_FILE"
if docker exec healthcare-db pg_dump -U $DB_USER -d $DB_NAME --verbose 2>&1 | gzip > "$BACKUP_FILE"; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Banco: OK ($FILE_SIZE)" | tee -a "$LOG_FILE"
else
    echo "❌ ERRO ao fazer backup do banco!" | tee -a "$LOG_FILE"
    exit 1
fi

# ============================================
# PARTE 2: Backup de Certificados Digitais
# ============================================
echo "" | tee -a "$LOG_FILE"
echo "🔐 [2/3] Fazendo backup de certificados digitais..." | tee -a "$LOG_FILE"

# Procurar por certificados .pfx no servidor
CERT_LOCATIONS=(
    "/home/umbrel/certs"
    "/home/umbrel/HealthCare/certs"
    "/etc/healthcare/certs"
    "/var/healthcare/certs"
)

CERTS_FOUND=0
mkdir -p "$CERTS_DIR"

for LOCATION in "${CERT_LOCATIONS[@]}"; do
    if [ -d "$LOCATION" ]; then
        echo "  📁 Encontrado: $LOCATION" | tee -a "$LOG_FILE"
        if cp -r "$LOCATION"/* "$CERTS_DIR/" 2>/dev/null; then
            CERTS_FOUND=$((CERTS_FOUND + $(ls "$LOCATION" 2>/dev/null | wc -l)))
            echo "  ✅ Certificados copiados" | tee -a "$LOG_FILE"
        fi
    fi
done

if [ $CERTS_FOUND -gt 0 ]; then
    echo "✅ Certificados: OK ($CERTS_FOUND arquivos)" | tee -a "$LOG_FILE"
    # Comprimir certificados
    cd "$BACKUP_DIR"
    tar czf "certs_${TIMESTAMP}.tar.gz" "certs_${TIMESTAMP}/" 2>/dev/null
    rm -rf "certs_${TIMESTAMP}"
    CERTS_SIZE=$(du -h "certs_${TIMESTAMP}.tar.gz" 2>/dev/null | cut -f1)
    echo "  📦 Arquivo: certs_${TIMESTAMP}.tar.gz ($CERTS_SIZE)" | tee -a "$LOG_FILE"
    cd - > /dev/null
else
    echo "⚠️  Nenhum certificado encontrado (esperado)" | tee -a "$LOG_FILE"
    rmdir "$CERTS_DIR" 2>/dev/null || true
fi

# ============================================
# PARTE 3: Resumo e Validação
# ============================================
echo "" | tee -a "$LOG_FILE"
echo "📊 [3/3] Resumo de Dados Protegidos:" | tee -a "$LOG_FILE"

PATIENT_COUNT=$(docker exec healthcare-db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM patients;" 2>/dev/null || echo "0")
QUESTIONNAIRE_COUNT=$(docker exec healthcare-db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM patient_questionnaires;" 2>/dev/null || echo "0")
CONSULTATION_COUNT=$(docker exec healthcare-db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM consultations WHERE status NOT IN ('CANCELLED');" 2>/dev/null || echo "0")
USER_COUNT=$(docker exec healthcare-db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
CERT_COUNT=$(docker exec healthcare-db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM \"DigitalCertificate\";" 2>/dev/null || echo "0")

echo "  👥 Pacientes: $PATIENT_COUNT" | tee -a "$LOG_FILE"
echo "  📋 Questionários: $QUESTIONNAIRE_COUNT" | tee -a "$LOG_FILE"
echo "  📅 Agendamentos: $CONSULTATION_COUNT" | tee -a "$LOG_FILE"
echo "  👤 Usuários: $USER_COUNT" | tee -a "$LOG_FILE"
echo "  🔐 Certificados Digitais: $CERT_COUNT" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "✅ Backup completo!" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "📂 Arquivos de Backup:" | tee -a "$LOG_FILE"
echo "  Banco: healthcare_${TIMESTAMP}.sql.gz" | tee -a "$LOG_FILE"
if [ -f "$BACKUP_DIR/certs_${TIMESTAMP}.tar.gz" ]; then
    echo "  Certs: certs_${TIMESTAMP}.tar.gz" | tee -a "$LOG_FILE"
fi
echo "" | tee -a "$LOG_FILE"
echo "📍 Localização: $BACKUP_DIR/" | tee -a "$LOG_FILE"
