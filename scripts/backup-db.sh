#!/usr/bin/env bash
set -euo pipefail
DATE=$(date +%Y%m%d-%H%M%S)
OUT_DIR="backups"
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/backup-$DATE.sql.gz"
: "${DATABASE_URL:=}"
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL não definido" >&2
  exit 1
fi
# Extrai componentes simples se formato padrão
pg_dump "$DATABASE_URL" | gzip -9 > "$FILE"
sha256sum "$FILE" > "$FILE.sha256"
echo "Backup gerado em $FILE"
