#!/bin/bash

################################################################################
#
#  🔐 SCRIPT HELPER - Obter credenciais de backup do banco de dados
#
#  Busca as credenciais de Google Drive diretamente do PostgreSQL
#  Chamado pelo backup-complete.sh
#
################################################################################

# Configurações do banco
POSTGRES_USER="${POSTGRES_USER:-healthcare}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-umbrel_secure_pass}"
POSTGRES_DB="${POSTGRES_DB:-healthcare_db}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"

# Buscar credenciais do banco
get_backup_credential() {
  local key="$1"
  
  PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c \
    "SELECT value FROM \"SystemSetting\" WHERE key = '$key' LIMIT 1;" 2>/dev/null | sed 's/^ *//;s/ *$//'
}

# Exportar como variáveis para o script de backup
export GDRIVE_SERVICE_ACCOUNT_JSON=$(get_backup_credential 'GDRIVE_SERVICE_ACCOUNT_JSON')
export GDRIVE_FOLDER_ID=$(get_backup_credential 'GDRIVE_FOLDER_ID')

# Debug (comentado em produção)
# echo "Service Account: ${#GDRIVE_SERVICE_ACCOUNT_JSON} chars"
# echo "Folder ID: $GDRIVE_FOLDER_ID"
