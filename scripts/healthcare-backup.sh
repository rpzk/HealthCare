#!/bin/bash

# Script para realizar backup completo do sistema HealthCare

# Definir variáveis
BACKUP_DIR="/var/backups/healthcare"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP="$BACKUP_DIR/healthcare_db_$TIMESTAMP.sql"
CONFIG_BACKUP="$BACKUP_DIR/healthcare_config_$TIMESTAMP.tar.gz"
LOG_FILE="$BACKUP_DIR/backup_$TIMESTAMP.log"

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

# Iniciar log
echo "Iniciando backup completo em $(date)" | tee -a "$LOG_FILE"

# Verificar espaço em disco
DISK_SPACE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')
echo "Espaço disponível para backup: $DISK_SPACE" | tee -a "$LOG_FILE"

# Backup do banco de dados
echo "Realizando backup do banco de dados..." | tee -a "$LOG_FILE"
cd /opt/healthcare || { echo "Diretório não encontrado"; exit 1; }

if docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U healthcare healthcare_db > "$DB_BACKUP"; then
    echo "Backup do banco de dados concluído: $DB_BACKUP" | tee -a "$LOG_FILE"
    echo "Tamanho do arquivo: $(du -h "$DB_BACKUP" | cut -f1)" | tee -a "$LOG_FILE"
else
    echo "ERRO: Falha ao realizar backup do banco de dados" | tee -a "$LOG_FILE"
    exit 1
fi

# Backup das configurações
echo "Realizando backup das configurações..." | tee -a "$LOG_FILE"
tar -czf "$CONFIG_BACKUP" \
    /opt/healthcare/.env.production \
    /opt/healthcare/docker-compose.prod.yml \
    /etc/nginx/sites-available/healthcare \
    /etc/nginx/sites-enabled/healthcare \
    /etc/letsencrypt/live/*/fullchain.pem \
    /etc/letsencrypt/live/*/privkey.pem \
    2>/dev/null

echo "Backup das configurações concluído: $CONFIG_BACKUP" | tee -a "$LOG_FILE"
echo "Tamanho do arquivo: $(du -h "$CONFIG_BACKUP" | cut -f1)" | tee -a "$LOG_FILE"

# Compactar backup do banco de dados
echo "Compactando backup do banco de dados..." | tee -a "$LOG_FILE"
gzip "$DB_BACKUP"
echo "Compactação concluída: $DB_BACKUP.gz" | tee -a "$LOG_FILE"
echo "Tamanho após compactação: $(du -h "$DB_BACKUP.gz" | cut -f1)" | tee -a "$LOG_FILE"

# Limpeza de backups antigos (manter últimos 7 dias)
echo "Limpando backups antigos..." | tee -a "$LOG_FILE"
find "$BACKUP_DIR" -name "healthcare_db_*.sql.gz" -type f -mtime +7 -delete
find "$BACKUP_DIR" -name "healthcare_config_*.tar.gz" -type f -mtime +7 -delete
find "$BACKUP_DIR" -name "backup_*.log" -type f -mtime +7 -delete
echo "Limpeza concluída" | tee -a "$LOG_FILE"

# Verificar integridade do backup
echo "Verificando integridade do backup..." | tee -a "$LOG_FILE"
if gunzip -t "$DB_BACKUP.gz"; then
    echo "Verificação de integridade do backup do banco de dados: OK" | tee -a "$LOG_FILE"
else
    echo "ERRO: Backup do banco de dados corrompido" | tee -a "$LOG_FILE"
    exit 1
fi

# Listar todos os backups disponíveis
echo "Backups disponíveis:" | tee -a "$LOG_FILE"
find "$BACKUP_DIR" -name "healthcare_db_*.sql.gz" -type f | sort | tee -a "$LOG_FILE"

# Resumo final
echo "Backup completo concluído em $(date)" | tee -a "$LOG_FILE"
echo "Arquivos de backup:" | tee -a "$LOG_FILE"
echo "- Banco de dados: $DB_BACKUP.gz" | tee -a "$LOG_FILE"
echo "- Configurações: $CONFIG_BACKUP" | tee -a "$LOG_FILE"
echo "- Log: $LOG_FILE" | tee -a "$LOG_FILE"

echo "Para restaurar o banco de dados:"
echo "gunzip < $DB_BACKUP.gz | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U healthcare healthcare_db"
