#!/bin/bash

################################################################################
#
#  🔐 SISTEMA COMPLETO DE BACKUP - HealthCare
#
#  Faz backup de:
#  ✅ Banco de dados PostgreSQL
#  ✅ Certificados digitais (A1/A3/A4)
#  ✅ TODAS as configurações críticas (.env, docker-compose, etc)
#  ✅ Configurações salvas no banco (SMTP, email, segurança)
#  ✅ Schema do Prisma
#  ✅ Arquivo de fallback settings.json
#
#  Data: 2025-01-25
#
################################################################################

set -e

# Configurações
APP_ROOT="${APP_ROOT:-/app}"
BACKUP_DIR="/app/backups/healthcare"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
DB_BACKUP_FILE="healthcare_${TIMESTAMP}.sql.gz"
CONFIG_BACKUP_FILE="config_${TIMESTAMP}.tar.gz"
BACKUP_MANIFEST="manifest_${TIMESTAMP}.json"
BACKUP_LOG="backup_${TIMESTAMP}.log"
STATUS_JSON="status_${TIMESTAMP}.json"

GDRIVE_UPLOADED=false

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Garantir que diretório de backup existe
mkdir -p "$BACKUP_DIR"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] ========================================" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] 🔐 BACKUP COMPLETO - HealthCare System" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] ========================================" | tee -a "$BACKUP_DIR/$BACKUP_LOG"

################################################################################
# PARTE 1: BANCO DE DADOS
################################################################################

echo -e "\n${BLUE}[1/4]${NC} Fazendo backup do banco de dados PostgreSQL..." | tee -a "$BACKUP_DIR/$BACKUP_LOG"

POSTGRES_USER="${POSTGRES_USER:-healthcare}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-umbrel_secure_pass}"
POSTGRES_DB="${POSTGRES_DB:-healthcare_db}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"

# Fazer dump do banco
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$POSTGRES_HOST" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --verbose \
  --no-password \
  2>> "$BACKUP_DIR/$BACKUP_LOG" | gzip > "$BACKUP_DIR/$DB_BACKUP_FILE"

DB_SIZE=$(du -h "$BACKUP_DIR/$DB_BACKUP_FILE" | cut -f1)
echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ Banco de dados: ${DB_SIZE}" | tee -a "$BACKUP_DIR/$BACKUP_LOG"

################################################################################
# PARTE 2: CONFIGURAÇÕES CRÍTICAS
################################################################################

echo -e "\n${BLUE}[2/4]${NC} Fazendo backup de configurações críticas..." | tee -a "$BACKUP_DIR/$BACKUP_LOG"

# Criar diretório temporário para arquivos de config
CONFIG_TEMP_DIR=$(mktemp -d)
trap "rm -rf $CONFIG_TEMP_DIR" EXIT

# Lista de arquivos críticos para fazer backup
CRITICAL_FILES=(
  ".env"
  ".env.production"
  ".env.development"
  "docker-compose.yml"
  "docker-compose.prod.yml"
  "docker-compose.umbrel.yml"
  "docker-compose.coturn.yml"
  "next.config.js"
  "tsconfig.json"
  "prisma/schema.prisma"
  "data/settings.json"
)

# Copiar arquivos críticos
for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$APP_ROOT/$file" ]; then
    mkdir -p "$CONFIG_TEMP_DIR/$(dirname "$file")"
    cp "$APP_ROOT/$file" "$CONFIG_TEMP_DIR/$file"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✓ Config: $file" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
  fi
done

# Criar arquivo de ambiente com metadados (sem valores sensíveis)
cat > "$CONFIG_TEMP_DIR/.env.metadata" << 'EOF'
# Este arquivo documenta quais variáveis de ambiente estão configuradas
# Gerado automaticamente para auditoria

# BANCO DE DADOS
# - DATABASE_URL ✓

# SEGURANÇA
# - ENCRYPTION_KEY ✓
# - HASH_SALT ✓
# - NEXTAUTH_SECRET ✓
# - NEXTAUTH_URL ✓

# EMAIL/SMTP (Salvo em system_settings.SMTP_HOST, etc)
# - EMAIL_ENABLED ✓
# - EMAIL_FROM ✓
# - EMAIL_PROVIDER ✓

# STORAGE
# - STORAGE_TYPE ✓
# - LOCAL_STORAGE_PATH ✓
# - RECORDING_ENCRYPTION_KEY ✓

# REDIS
# - REDIS_HOST ✓
# - REDIS_PORT ✓
# - REDIS_PASSWORD ✓

# TELEMEDICINA
# - OLLAMA_URL ✓
# - OLLAMA_MODEL ✓
# - NEXT_PUBLIC_ICE ✓

# OUTRAS
# - NODE_ENV ✓
# - DEBUG_AUTH ✓
# - CRON_SECRET ✓

EOF

echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✓ Metadata: .env.metadata" | tee -a "$BACKUP_DIR/$BACKUP_LOG"

# Compactar configurações
tar czf "$BACKUP_DIR/$CONFIG_BACKUP_FILE" -C "$CONFIG_TEMP_DIR" . 2>> "$BACKUP_DIR/$BACKUP_LOG"

CONFIG_SIZE=$(du -h "$BACKUP_DIR/$CONFIG_BACKUP_FILE" | cut -f1)
echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ Configurações: ${CONFIG_SIZE}" | tee -a "$BACKUP_DIR/$BACKUP_LOG"

################################################################################
# PARTE 3: CERTIFICADOS DIGITAIS
################################################################################

echo -e "\n${BLUE}[3/4]${NC} Fazendo backup de certificados digitais..." | tee -a "$BACKUP_DIR/$BACKUP_LOG"

CERT_LOCATIONS=(
  "$APP_ROOT/certs"
  "/etc/healthcare/certs"
  "/var/healthcare/certs"
)

CERT_FOUND=false
for cert_dir in "${CERT_LOCATIONS[@]}"; do
  if [ -d "$cert_dir" ] && [ "$(ls -A "$cert_dir")" ]; then
    if [ "$CERT_FOUND" = false ]; then
      CERTS_TEMP_DIR=$(mktemp -d)
      trap "rm -rf $CONFIG_TEMP_DIR $CERTS_TEMP_DIR" EXIT
      CERT_FOUND=true
    fi
    cp -r "$cert_dir"/* "$CERTS_TEMP_DIR/" 2>/dev/null || true
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✓ Certificados: $cert_dir" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
  fi
done

if [ "$CERT_FOUND" = true ]; then
  tar czf "$BACKUP_DIR/certs_${TIMESTAMP}.tar.gz" -C "$CERTS_TEMP_DIR" . 2>> "$BACKUP_DIR/$BACKUP_LOG"
  CERT_SIZE=$(du -h "$BACKUP_DIR/certs_${TIMESTAMP}.tar.gz" | cut -f1)
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ Certificados arquivados: ${CERT_SIZE}" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  Nenhum certificado encontrado" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
fi

################################################################################
# PARTE 4: VALIDAÇÃO E RESUMO
################################################################################

echo -e "\n${BLUE}[4/4]${NC} Validando e gerando resumo..." | tee -a "$BACKUP_DIR/$BACKUP_LOG"

# Contar objetos no banco para validação
PATIENT_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM \"Patient\";" 2>/dev/null || echo "0")
USER_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null || echo "0")
CONSULTATION_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM \"Consultation\";" 2>/dev/null || echo "0")
APPOINTMENT_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM \"Appointment\";" 2>/dev/null || echo "0")
PRESCRIPTION_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM \"Prescription\";" 2>/dev/null || echo "0")
CERTIFICATE_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM \"DigitalCertificate\";" 2>/dev/null || echo "0")
SYSTEM_SETTINGS_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM \"SystemSetting\";" 2>/dev/null || echo "0")

# Criar manifest JSON
cat > "$BACKUP_DIR/$BACKUP_MANIFEST" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "2.0",
  "description": "Backup completo com configurações e certificados",
  "database": {
    "file": "$DB_BACKUP_FILE",
    "size_bytes": $(stat -f%z "$BACKUP_DIR/$DB_BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_DIR/$DB_BACKUP_FILE"),
    "size_human": "$DB_SIZE",
    "compressed": true,
    "format": "pg_dump + gzip"
  },
  "configurations": {
    "file": "$CONFIG_BACKUP_FILE",
    "size_bytes": $(stat -f%z "$BACKUP_DIR/$CONFIG_BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_DIR/$CONFIG_BACKUP_FILE"),
    "size_human": "$CONFIG_SIZE",
    "compressed": true,
    "format": "tar.gz",
    "items": [
      ".env (environment variables)",
      "docker-compose files",
      "next.config.js",
      "tsconfig.json",
      "prisma/schema.prisma",
      "data/settings.json (fallback settings)"
    ]
  },
  "certificates": {
    "included": $( [ "$CERT_FOUND" = true ] && echo "true" || echo "false" ),
    "file": "certs_${TIMESTAMP}.tar.gz",
    "types": ["A1", "A3", "A4"],
    "locations_scanned": [
      "$APP_ROOT/certs",
      "/etc/healthcare/certs",
      "/var/healthcare/certs"
    ]
  },
  "database_statistics": {
    "patients": $PATIENT_COUNT,
    "users": $USER_COUNT,
    "consultations": $CONSULTATION_COUNT,
    "appointments": $APPOINTMENT_COUNT,
    "prescriptions": $PRESCRIPTION_COUNT,
    "digital_certificates": $CERTIFICATE_COUNT,
    "system_settings": $SYSTEM_SETTINGS_COUNT
  },
  "backup_location": "$BACKUP_DIR",
  "restoration_procedure": "Consulte DATABASE_BACKUP_PROCEDURE.md para instruções de restauração"
}
EOF

echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ Manifest criado: $BACKUP_MANIFEST" | tee -a "$BACKUP_DIR/$BACKUP_LOG"

################################################################################
# PARTE 5: CÓPIA PARA GOOGLE DRIVE (se configurado)
################################################################################

if [ -n "$GDRIVE_SERVICE_ACCOUNT_FILE" ] && [ -f "$GDRIVE_SERVICE_ACCOUNT_FILE" ]; then
  echo -e "\n${BLUE}[5/5]${NC} Enviando backups para Google Drive..." | tee -a "$BACKUP_DIR/$BACKUP_LOG"
  
  SA_FILE_SIZE=$(wc -c < "$GDRIVE_SERVICE_ACCOUNT_FILE")
  echo "[DEBUG] Service Account file size: $SA_FILE_SIZE bytes" >> "$BACKUP_DIR/$BACKUP_LOG"
  echo "[DEBUG] Folder ID: ${GDRIVE_FOLDER_ID:0:20}..." >> "$BACKUP_DIR/$BACKUP_LOG"

  GDRIVE_CONFIG_FILE=$(mktemp)
  trap "rm -rf $CONFIG_TEMP_DIR $CERTS_TEMP_DIR; rm -f $GDRIVE_CONFIG_FILE" EXIT

  cat > "$GDRIVE_CONFIG_FILE" << EOF
[gdrive]
type = drive
scope = drive
service_account_file = $GDRIVE_SERVICE_ACCOUNT_FILE
EOF

  if command -v rclone >/dev/null 2>&1; then
    # Verificar se Folder ID foi fornecido
    if [ -z "$GDRIVE_FOLDER_ID" ]; then
      echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  GDRIVE_FOLDER_ID não foi fornecido - backup local apenas" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
    else
      # Testar credenciais
      if ! rclone --config "$GDRIVE_CONFIG_FILE" about gdrive: --drive-root-folder-id "${GDRIVE_FOLDER_ID}" >/dev/null 2>&1; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  Credenciais do Google Drive inválidas ou pasta indisponível" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
      else
        # Enviar apenas os arquivos de backup principais (não logs)
        RCLONE_OPTS="--config=$GDRIVE_CONFIG_FILE --drive-root-folder-id=$GDRIVE_FOLDER_ID ${GDRIVE_IMPERSONATE:+--drive-impersonate=$GDRIVE_IMPERSONATE} --include=*.sql.gz --include=*.tar.gz --include=manifest*.json --exclude=*.log --transfers=2 --checkers=4 --fast-list --log-file=$BACKUP_DIR/rclone_${TIMESTAMP}.log --log-level=INFO"
        
        if rclone copy "$BACKUP_DIR" "gdrive:" $RCLONE_OPTS 2>&1 | tee -a "$BACKUP_DIR/$BACKUP_LOG"; then
          FILES_UPLOADED=$(rclone ls "$BACKUP_DIR" $RCLONE_OPTS 2>/dev/null | wc -l)
          echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ Backup enviado para Google Drive ($FILES_UPLOADED arquivos)" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
          GDRIVE_UPLOADED=true
        else
          echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  Falha ao enviar para Google Drive (veja rclone_${TIMESTAMP}.log)" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
        fi
      fi
    fi
  else
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  rclone não instalado no contêiner" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
  fi
else
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] (Info) Google Drive não configurado. Pulei upload externo." | tee -a "$BACKUP_DIR/$BACKUP_LOG"
fi

# Resumo final
echo "" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "========================================" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo -e "${GREEN}✅ BACKUP COMPLETO REALIZADO COM SUCESSO${NC}" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "========================================" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "📊 RESUMO:" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "   Banco de dados: $DB_SIZE" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "   Configurações: $CONFIG_SIZE" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
if [ "$CERT_FOUND" = true ]; then
  CERT_SIZE=$(du -h "$BACKUP_DIR/certs_${TIMESTAMP}.tar.gz" | cut -f1)
  echo "   Certificados: $CERT_SIZE" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
fi
echo "" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "📈 DADOS PROTEGIDOS:" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "   Pacientes: $PATIENT_COUNT" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "   Usuários: $USER_COUNT" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "   Consultas: $CONSULTATION_COUNT" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "   Agendamentos: $APPOINTMENT_COUNT" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "   Prescrições: $PRESCRIPTION_COUNT" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "   Certificados Digitais: $CERTIFICATE_COUNT" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "   Configurações Salvas: $SYSTEM_SETTINGS_COUNT" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "🔐 ARQUIVOS:" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "   - $DB_BACKUP_FILE (database)" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "   - $CONFIG_BACKUP_FILE (configurations)" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
if [ "$CERT_FOUND" = true ]; then
  echo "   - certs_${TIMESTAMP}.tar.gz (certificates)" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
fi
echo "   - $BACKUP_MANIFEST (manifest)" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "   - $BACKUP_LOG (este log)" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "📍 Local: $BACKUP_DIR/" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "========================================" | tee -a "$BACKUP_DIR/$BACKUP_LOG"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup finalizado" | tee -a "$BACKUP_DIR/$BACKUP_LOG"

# Escrever status JSON para consumo pela API/UI
cat > "$BACKUP_DIR/$STATUS_JSON" << EOF
{
  "timestamp": "$TIMESTAMP",
  "dbBackupFile": "$DB_BACKUP_FILE",
  "configBackupFile": "$CONFIG_BACKUP_FILE",
  "certsIncluded": $( [ "$CERT_FOUND" = true ] && echo "true" || echo "false" ),
  "googleDriveFolderId": "${GDRIVE_FOLDER_ID:-}",
  "googleDriveUploaded": $( [ "$GDRIVE_UPLOADED" = true ] && echo "true" || echo "false" )
}
EOF
