#!/bin/bash

# Script para monitoramento contínuo do sistema HealthCare
# Recomendado executar como serviço systemd

# Definir variáveis
LOGS_DIR="/var/log/healthcare"
ALERT_EMAIL="admin@healthcare.com"
CHECK_INTERVAL=300  # 5 minutos em segundos
MAX_CONSECUTIVE_FAILURES=3
API_ENDPOINT="http://localhost:3000/api/health"
SLACK_WEBHOOK=""  # Opcional: adicione URL do webhook do Slack para notificações
CONSECUTIVE_FAILURES=0

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
fi

LOG_FILE="$LOGS_DIR/monitor.log"
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"

# Função para registrar mensagens
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Função para enviar alertas
send_alert() {
  SUBJECT="[ALERTA] Sistema HealthCare - $1"
  MESSAGE="$2\n\nData e hora: $(date)\nServidor: $(hostname)\n\nPor favor, verifique o sistema o mais rápido possível."
  
  # Enviar email
  echo -e "$MESSAGE" | mail -s "$SUBJECT" "$ALERT_EMAIL"
  
  # Enviar para Slack se configurado
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -s -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"$SUBJECT\n$MESSAGE\"}" \
      "$SLACK_WEBHOOK"
  fi
  
  log "Alerta enviado: $SUBJECT"
}

# Função para verificar o sistema
check_system() {
  log "Iniciando verificação do sistema"
  
  # Verificar se todos os serviços estão rodando
  cd /opt/healthcare || return 1
  
  SERVICES_STATUS=$(docker-compose -f docker-compose.prod.yml ps)
  FAILED_SERVICES=""
  
  for SERVICE in app postgres redis ollama; do
    if ! echo "$SERVICES_STATUS" | grep -q "$SERVICE.*Up"; then
      FAILED_SERVICES="$FAILED_SERVICES\n- $SERVICE"
    fi
  done
  
  if [ -n "$FAILED_SERVICES" ]; then
    log "ERRO: Serviços não estão rodando:$FAILED_SERVICES"
    send_alert "Falha em Serviços" "Os seguintes serviços não estão rodando:$FAILED_SERVICES"
    return 1
  fi
  
  # Verificar API
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT")
  if [ "$HTTP_STATUS" -ne 200 ]; then
    log "ERRO: API de saúde retornou status $HTTP_STATUS"
    send_alert "API Indisponível" "A verificação de saúde da API retornou status $HTTP_STATUS (esperado: 200)"
    return 1
  fi
  
  # Verificar uso de disco
  DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
  if [ "$DISK_USAGE" -gt 90 ]; then
    log "ALERTA: Uso de disco crítico: $DISK_USAGE%"
    send_alert "Espaço em Disco Crítico" "O uso de disco está em $DISK_USAGE% (crítico acima de 90%)"
    # Não retornamos 1 aqui porque o sistema ainda pode estar funcionando
  fi
  
  # Verificar uso de memória
  MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
  if [ "$MEM_USAGE" -gt 95 ]; then
    log "ALERTA: Uso de memória crítico: $MEM_USAGE%"
    send_alert "Memória Crítica" "O uso de memória está em $MEM_USAGE% (crítico acima de 95%)"
  fi
  
  # Verificar uso de CPU
  CPU_LOAD=$(uptime | awk '{print $(NF-2)}' | tr -d ',')
  CPU_CORES=$(nproc)
  CPU_THRESHOLD=$(echo "$CPU_CORES * 0.8" | bc)
  
  if (( $(echo "$CPU_LOAD > $CPU_THRESHOLD" | bc -l) )); then
    log "ALERTA: Carga de CPU alta: $CPU_LOAD (threshold: $CPU_THRESHOLD)"
    send_alert "Carga de CPU Alta" "A carga de CPU está em $CPU_LOAD (threshold: $CPU_THRESHOLD para $CPU_CORES cores)"
  fi
  
  # Verificar logs por erros críticos
  RECENT_ERRORS=$(docker-compose -f docker-compose.prod.yml logs --tail=100 app | grep -i "error\|exception\|fatal" | wc -l)
  if [ "$RECENT_ERRORS" -gt 5 ]; then
    log "ALERTA: Muitos erros recentes nos logs: $RECENT_ERRORS"
    ERROR_SAMPLE=$(docker-compose -f docker-compose.prod.yml logs --tail=100 app | grep -i "error\|exception\|fatal" | head -3)
    send_alert "Erros nos Logs" "Detectados $RECENT_ERRORS erros recentes nos logs. Exemplos:\n$ERROR_SAMPLE"
  fi
  
  # Verificar conexão com banco de dados
  if ! docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U healthcare > /dev/null 2>&1; then
    log "ERRO: Falha na conexão com o banco de dados"
    send_alert "Falha no Banco de Dados" "Não foi possível conectar ao banco de dados PostgreSQL"
    return 1
  fi
  
  # Verificar serviço Ollama
  if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    log "ERRO: Serviço Ollama não está respondendo"
    send_alert "Falha no Serviço de IA" "O serviço Ollama não está respondendo"
    return 1
  fi
  
  log "Verificação do sistema concluída com sucesso"
  return 0
}

log "Iniciando monitoramento contínuo do sistema HealthCare"
log "Intervalo de verificação: $CHECK_INTERVAL segundos"
log "Alertas serão enviados para: $ALERT_EMAIL"

# Loop de monitoramento contínuo
while true; do
  if check_system; then
    CONSECUTIVE_FAILURES=0
  else
    CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES+1))
    log "Falha consecutiva #$CONSECUTIVE_FAILURES"
    
    if [ "$CONSECUTIVE_FAILURES" -ge "$MAX_CONSECUTIVE_FAILURES" ]; then
      send_alert "Múltiplas Falhas Consecutivas" "O sistema falhou em $CONSECUTIVE_FAILURES verificações consecutivas. Uma intervenção manual pode ser necessária."
      
      # Tentar reiniciar todos os serviços
      log "Tentando reiniciar todos os serviços..."
      cd /opt/healthcare || true
      docker-compose -f docker-compose.prod.yml restart
      
      # Resetar contador após tentativa de reinicialização
      CONSECUTIVE_FAILURES=0
    fi
  fi
  
  sleep "$CHECK_INTERVAL"
done
