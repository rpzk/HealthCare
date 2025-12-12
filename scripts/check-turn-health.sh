#!/bin/bash

# Health Check para servidor TURN/Coturn
# Executar via cron: */5 * * * * /path/to/check-turn-health.sh

set -e

LOG_FILE="/var/log/turnserver/health-check.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@clinica.com.br}"
TURN_HOST="${TURN_HOST:-localhost}"
TURN_PORT="${TURN_PORT:-3478}"

echo "[$(date)] Iniciando health check do TURN server..." >> "$LOG_FILE"

# 1. Verificar se processo está rodando
if pgrep -x "turnserver" > /dev/null; then
    echo "[$(date)] ✓ Turnserver está rodando" >> "$LOG_FILE"
else
    echo "[$(date)] ✗ ALERTA: Turnserver não está rodando!" >> "$LOG_FILE"
    
    # Tentar reiniciar
    systemctl restart coturn || docker-compose -f docker-compose.coturn.yml restart
    
    # Enviar alerta
    echo "TURN server parou e foi reiniciado em $(hostname) às $(date)" | \
        mail -s "ALERTA: TURN Server Reiniciado" "$ALERT_EMAIL" 2>/dev/null || true
    
    exit 1
fi

# 2. Verificar conectividade na porta
if timeout 3 bash -c "echo > /dev/tcp/$TURN_HOST/$TURN_PORT" 2>/dev/null; then
    echo "[$(date)] ✓ Porta $TURN_PORT acessível" >> "$LOG_FILE"
else
    echo "[$(date)] ✗ ALERTA: Porta $TURN_PORT não responde!" >> "$LOG_FILE"
    
    # Enviar alerta
    echo "TURN server porta $TURN_PORT não responde em $(hostname) às $(date)" | \
        mail -s "ALERTA: TURN Server Inacessível" "$ALERT_EMAIL" 2>/dev/null || true
    
    exit 1
fi

# 3. Verificar uso de memória
MEM_USAGE=$(ps aux | grep turnserver | grep -v grep | awk '{print $4}')
if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    echo "[$(date)] ⚠ AVISO: Uso de memória alto: $MEM_USAGE%" >> "$LOG_FILE"
    
    # Enviar aviso (não crítico)
    echo "TURN server usando $MEM_USAGE% de memória em $(hostname) às $(date)" | \
        mail -s "AVISO: TURN Server Memória Alta" "$ALERT_EMAIL" 2>/dev/null || true
fi

# 4. Verificar sessões ativas (se coturn estiver acessível)
if command -v turnadmin &> /dev/null; then
    SESSIONS=$(turnadmin -l 2>/dev/null | grep -c "session" || echo "0")
    echo "[$(date)] ℹ Sessões ativas: $SESSIONS" >> "$LOG_FILE"
    
    # Alertar se muitas sessões (pode indicar abuso)
    if [ "$SESSIONS" -gt 100 ]; then
        echo "[$(date)] ⚠ AVISO: Número alto de sessões: $SESSIONS" >> "$LOG_FILE"
    fi
fi

# 5. Verificar espaço em disco (logs)
DISK_USAGE=$(df -h /var/log | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "[$(date)] ⚠ AVISO: Disco de logs com $DISK_USAGE% de uso" >> "$LOG_FILE"
    
    # Limpar logs antigos
    find /var/log/turnserver -name "*.log.*" -mtime +7 -delete
    
    echo "Disco de logs em $(hostname) com $DISK_USAGE% - logs antigos removidos" | \
        mail -s "AVISO: Disco de Logs Cheio" "$ALERT_EMAIL" 2>/dev/null || true
fi

echo "[$(date)] Health check concluído com sucesso" >> "$LOG_FILE"

# Rotacionar log do próprio health check
if [ -f "$LOG_FILE" ] && [ $(wc -l < "$LOG_FILE") -gt 10000 ]; then
    mv "$LOG_FILE" "$LOG_FILE.old"
    echo "[$(date)] Log rotacionado" > "$LOG_FILE"
fi

exit 0
