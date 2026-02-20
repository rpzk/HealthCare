#!/bin/bash

# Script de Backup do Banco de Dados PostgreSQL (HealthCare)
# Retenção: 7 dias localmente (configurável para offsite)

# Configurações
BACKUP_DIR="/home/umbrel/HealthCare/backups/db"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
DB_USER=postgres
DB_NAME=healthcare
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"
RETENTION_DAYS=7

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Iniciando backup do banco de dados..."

# Executar pg_dump internamente no container do postgres ou no host
# Aqui assumimos que o host tem acesso ao db via docker
DOCKER_CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep postgres)

if [ -n "$DOCKER_CONTAINER_NAME" ]; then
  # Executar via Docker
  docker exec "$DOCKER_CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
  # Executar localmente (requer pg_dump instalado e PGHOST/PGPASSWORD configurados)
  # Usa a string de conexão do .env se existir
  if [ -f "/home/umbrel/HealthCare/.env" ]; then
      export $(grep -v '^#' /home/umbrel/HealthCare/.env | xargs)
  fi
  
  if [ -n "$DATABASE_URL" ]; then
    pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
  else
    echo "[ERRO] Não foi possível determinar como conectar ao banco. Configure DATABASE_URL no .env ou garanta que o container Docker está rodando."
    exit 1
  fi
fi

if [ $? -eq 0 ]; then
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup concluído com sucesso: $BACKUP_FILE"
  
  # Limpeza de backups antigos
  echo "Limpando backups mais antigos que $RETENTION_DAYS dias..."
  find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
  echo "Limpeza concluída."
else
  echo "[ERRO] Falha ao realizar backup do banco de dados."
  exit 1
fi
