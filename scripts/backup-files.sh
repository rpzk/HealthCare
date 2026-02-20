#!/bin/bash

# Script de Backup de Arquivos de Upload (HealthCare)
# Retenção: 7 dias localmente (configurável para offsite)

# Configurações
UPLOAD_DIR="/home/umbrel/HealthCare/uploads"
BACKUP_DIR="/home/umbrel/HealthCare/backups/files"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/uploads_backup_$DATE.tar.gz"
RETENTION_DAYS=7

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Iniciando backup dos arquivos de upload..."

# Verificar se o diretório de uploads existe
if [ ! -d "$UPLOAD_DIR" ]; then
  echo "O diretório $UPLOAD_DIR não existe. Criando um vazio para evitar erros futuros..."
  mkdir -p "$UPLOAD_DIR"
fi

# Compactar diretório
tar -czf "$BACKUP_FILE" -C "${UPLOAD_DIR%/*}" "${UPLOAD_DIR##*/}"

if [ $? -eq 0 ]; then
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup de arquivos concluído com sucesso: $BACKUP_FILE"
  
  # Limpeza de backups antigos
  echo "Limpando backups mais antigos que $RETENTION_DAYS dias..."
  find "$BACKUP_DIR" -type f -name "uploads_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
  echo "Limpeza concluída."
else
  echo "[ERRO] Falha ao realizar backup dos arquivos."
  exit 1
fi
