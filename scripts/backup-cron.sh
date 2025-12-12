#!/bin/bash

# Backup Automático - Healthcare System
# Para agendar via crontab: 0 3 * * * /path/to/backup-cron.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/healthcare}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-healthcare}"
POSTGRES_DB="${POSTGRES_DB:-healthcare_db}"
UPLOADS_DIR="${UPLOADS_DIR:-/home/umbrel/HealthCare/uploads}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup..."

# 1. Backup PostgreSQL
echo "[$(date)] Backup PostgreSQL..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -F c \
  -f "$BACKUP_DIR/db_backup_$TIMESTAMP.dump"

DB_SIZE=$(du -h "$BACKUP_DIR/db_backup_$TIMESTAMP.dump" | cut -f1)
echo "[$(date)] Database backup: $DB_SIZE"

# 2. Backup arquivos
echo "[$(date)] Backup arquivos..."
tar -czf "$BACKUP_DIR/files_backup_$TIMESTAMP.tar.gz" -C "$UPLOADS_DIR" .

FILES_SIZE=$(du -h "$BACKUP_DIR/files_backup_$TIMESTAMP.tar.gz" | cut -f1)
echo "[$(date)] Files backup: $FILES_SIZE"

# 3. Upload para S3 (se configurado)
if [ -n "$S3_BACKUP_BUCKET" ]; then
  echo "[$(date)] Upload para S3..."
  aws s3 cp "$BACKUP_DIR/db_backup_$TIMESTAMP.dump" "s3://$S3_BACKUP_BUCKET/backups/"
  aws s3 cp "$BACKUP_DIR/files_backup_$TIMESTAMP.tar.gz" "s3://$S3_BACKUP_BUCKET/backups/"
fi

# 4. Rotação de backups antigos
echo "[$(date)] Rotação de backups (manter últimos $RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -name "db_backup_*.dump" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "files_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup concluído com sucesso!"
