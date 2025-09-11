#!/bin/bash

# Script para rotação de logs e limpeza do sistema
# Recomendado executar semanalmente via cron

# Definir variáveis
LOGS_DIR="/var/log/healthcare"
BACKUPS_DIR="/var/backups/healthcare"
MAX_LOG_AGE=30  # dias
MAX_BACKUP_AGE=90  # dias
DOCKER_PRUNE_AGE=15  # dias

# Verificar se está sendo executado como root
if [ "$(id -u)" -ne 0 ]; then
  echo "Este script precisa ser executado como root" >&2
  exit 1
fi

# Criar diretório de logs se não existir
if [ ! -d "$LOGS_DIR" ]; then
  mkdir -p "$LOGS_DIR"
  chown root:adm "$LOGS_DIR"
  chmod 755 "$LOGS_DIR"
  echo "Diretório de logs criado: $LOGS_DIR"
fi

echo "===== MANUTENÇÃO DO SISTEMA HEALTHCARE ====="
echo "Data: $(date)"
echo "==========================================="

# Função para registrar mensagens
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOGS_DIR/maintenance.log"
}

# Rotação de logs da aplicação
log "Iniciando rotação de logs"
if [ -d "$LOGS_DIR" ]; then
  find "$LOGS_DIR" -name "*.log" -type f -mtime +7 | while read -r file; do
    if [ ! -f "${file}.1.gz" ]; then
      log "Compactando log: $file"
      gzip -c "$file" > "${file}.1.gz"
      cat /dev/null > "$file"
    fi
  done
  
  # Remover logs antigos
  find "$LOGS_DIR" -name "*.log.*.gz" -type f -mtime +$MAX_LOG_AGE -delete
  log "Logs antigos com mais de $MAX_LOG_AGE dias foram removidos"
else
  log "Diretório de logs não encontrado: $LOGS_DIR"
fi

# Limpeza de backups antigos
if [ -d "$BACKUPS_DIR" ]; then
  log "Verificando backups antigos"
  OLD_BACKUPS=$(find "$BACKUPS_DIR" -name "healthcare_db_*.sql" -type f -mtime +$MAX_BACKUP_AGE)
  
  if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r backup; do
      log "Removendo backup antigo: $backup"
      rm -f "$backup"
    done
    log "Backups antigos com mais de $MAX_BACKUP_AGE dias foram removidos"
  else
    log "Nenhum backup antigo encontrado"
  fi
else
  log "Diretório de backups não encontrado: $BACKUPS_DIR"
fi

# Limpeza de Docker
log "Iniciando limpeza do Docker"

# Remover imagens não utilizadas mais antigas que X dias
log "Removendo imagens Docker antigas..."
docker image prune -a --force --filter "until=${DOCKER_PRUNE_AGE}d"

# Limpar volumes não utilizados
log "Limpando volumes Docker não utilizados..."
docker volume prune --force

# Limpar redes não utilizadas
log "Limpando redes Docker não utilizadas..."
docker network prune --force

# Verificar espaço em disco
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
log "Uso atual de disco: $DISK_USAGE%"

if [ "$DISK_USAGE" -gt 85 ]; then
  log "AVISO: Espaço em disco está acima de 85%"
  
  # Limpar arquivos temporários
  log "Limpando arquivos temporários..."
  find /tmp -type f -atime +7 -delete 2>/dev/null
  find /var/tmp -type f -atime +7 -delete 2>/dev/null
  
  # Limpar pacotes apt em cache
  log "Limpando cache do APT..."
  apt-get clean
  
  # Limpar logs do sistema
  log "Limpando logs do sistema..."
  journalctl --vacuum-time=7d
  
  # Verificar novamente
  DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
  log "Uso de disco após limpeza: $DISK_USAGE%"
fi

# Verificar e remover arquivos de upload temporários
UPLOAD_TMP="/opt/healthcare/uploads/tmp"
if [ -d "$UPLOAD_TMP" ]; then
  log "Limpando arquivos temporários de upload..."
  find "$UPLOAD_TMP" -type f -mtime +2 -delete
  log "Arquivos temporários de upload antigos foram removidos"
fi

# Verificar atualizações de segurança disponíveis
log "Verificando atualizações de segurança..."
apt-get update > /dev/null
SECURITY_UPDATES=$(apt-get upgrade -s | grep -i security | wc -l)

if [ "$SECURITY_UPDATES" -gt 0 ]; then
  log "AVISO: $SECURITY_UPDATES atualizações de segurança disponíveis"
  log "Considere aplicar as atualizações em breve com: apt-get upgrade"
else
  log "Nenhuma atualização de segurança pendente"
fi

# Verificar status dos serviços
log "Verificando status dos serviços essenciais..."
cd /opt/healthcare || exit 1

if ! docker-compose -f docker-compose.prod.yml ps | grep -q "app.*Up"; then
  log "AVISO: Serviço 'app' não está rodando, tentando reiniciar..."
  docker-compose -f docker-compose.prod.yml up -d app
fi

if ! docker-compose -f docker-compose.prod.yml ps | grep -q "postgres.*Up"; then
  log "AVISO: Serviço 'postgres' não está rodando, tentando reiniciar..."
  docker-compose -f docker-compose.prod.yml up -d postgres
fi

if ! docker-compose -f docker-compose.prod.yml ps | grep -q "redis.*Up"; then
  log "AVISO: Serviço 'redis' não está rodando, tentando reiniciar..."
  docker-compose -f docker-compose.prod.yml up -d redis
fi

if ! docker-compose -f docker-compose.prod.yml ps | grep -q "ollama.*Up"; then
  log "AVISO: Serviço 'ollama' não está rodando, tentando reiniciar..."
  docker-compose -f docker-compose.prod.yml up -d ollama
fi

log "Manutenção do sistema concluída"
echo "==========================================="
echo "Manutenção concluída em: $(date)"
echo "Para detalhes, consulte: $LOGS_DIR/maintenance.log"
