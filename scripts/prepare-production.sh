#!/bin/bash

# Script de preparação de ambiente de produção para HealthCare
# Este script prepara um servidor para executar o sistema em produção

echo "🚀 Preparação de Ambiente de Produção - HealthCare"
echo "=================================================="

# Definir variáveis
BACKUP_DIR="/var/backups/healthcare"
LOG_DIR="/var/log/healthcare"
ENV_FILE=".env.production"
SERVER_IP=$(hostname -I | awk '{print $1}')

# 1. Verificar pré-requisitos
echo "1. Verificando pré-requisitos..."

# Verificar Docker e Docker Compose
if ! command -v docker &> /dev/null || ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker e/ou Docker Compose não encontrados!"
    echo "Por favor, instale Docker e Docker Compose:"
    echo "curl -fsSL https://get.docker.com | sh"
    echo "apt-get install -y docker-compose"
    exit 1
else
    echo "✅ Docker e Docker Compose instalados."
    docker --version
    docker-compose --version
fi

# 2. Criar diretórios necessários
echo "2. Criando diretórios para o ambiente de produção..."

# Diretório de backups
if [ ! -d "$BACKUP_DIR" ]; then
    sudo mkdir -p "$BACKUP_DIR"
    echo "✅ Diretório de backups criado: $BACKUP_DIR"
else
    echo "✅ Diretório de backups já existe: $BACKUP_DIR"
fi

# Diretório de logs
if [ ! -d "$LOG_DIR" ]; then
    sudo mkdir -p "$LOG_DIR"
    echo "✅ Diretório de logs criado: $LOG_DIR"
else
    echo "✅ Diretório de logs já existe: $LOG_DIR"
fi

# 3. Configurar variáveis de ambiente para produção
echo "3. Configurando variáveis de ambiente para produção..."

if [ ! -f "$ENV_FILE" ]; then
    # Gerar chave segura para NextAuth
    NEXTAUTH_SECRET=$(openssl rand -base64 48)
    
    # Criar arquivo .env.production
    cat > "$ENV_FILE" << EOL
# Configuração de Produção - HealthCare
# Gerado em: $(date)

# Banco de dados
POSTGRES_PASSWORD=$(openssl rand -base64 16)

# NextAuth
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=http://$SERVER_IP:3000

# Ollama (IA Local)
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3

# Ambiente
NODE_ENV=production
EOL
    echo "✅ Arquivo $ENV_FILE criado com variáveis seguras."
else
    echo "⚠️ Arquivo $ENV_FILE já existe. Não foi sobrescrito."
fi

# 4. Configurar backup automático
echo "4. Configurando backup automático..."

# Criar script de backup
BACKUP_SCRIPT="/usr/local/bin/healthcare-backup.sh"
sudo cat > "$BACKUP_SCRIPT" << 'EOL'
#!/bin/bash

# Script de backup automático para HealthCare
BACKUP_DIR="/var/backups/healthcare"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/healthcare_db_$TIMESTAMP.sql"

# Criar backup do banco de dados
echo "Criando backup do banco de dados..."
docker-compose -f /opt/healthcare/docker-compose.prod.yml exec -T postgres pg_dump -U healthcare healthcare_db > "$BACKUP_FILE"

# Comprimir o arquivo
gzip "$BACKUP_FILE"

# Manter apenas os últimos 7 backups diários
find "$BACKUP_DIR" -name "healthcare_db_*.sql.gz" -type f -mtime +7 -delete

echo "Backup concluído: $BACKUP_FILE.gz"
EOL

sudo chmod +x "$BACKUP_SCRIPT"
echo "✅ Script de backup criado: $BACKUP_SCRIPT"

# Adicionar ao crontab para execução diária às 3h da manhã
(crontab -l 2>/dev/null; echo "0 3 * * * $BACKUP_SCRIPT >> $LOG_DIR/backup.log 2>&1") | crontab -
echo "✅ Backup automático configurado para execução diária às 3h."

# 5. Configurar monitoramento básico
echo "5. Configurando monitoramento básico..."

# Criar script de monitoramento
MONITOR_SCRIPT="/usr/local/bin/healthcare-monitor.sh"
sudo cat > "$MONITOR_SCRIPT" << 'EOL'
#!/bin/bash

# Script de monitoramento básico para HealthCare
LOG_FILE="/var/log/healthcare/monitor.log"
ALERT_EMAIL="admin@example.com"  # Substituir pelo email correto

# Verificar serviços
check_services() {
    if ! docker ps | grep -q healthcare-app; then
        echo "[$(date)] ALERTA: Container da aplicação não está rodando!" | tee -a "$LOG_FILE"
        echo "Container da aplicação não está rodando!" | mail -s "ALERTA: HealthCare App Down" "$ALERT_EMAIL"
        return 1
    fi
    
    if ! docker ps | grep -q healthcare-db; then
        echo "[$(date)] ALERTA: Container do banco de dados não está rodando!" | tee -a "$LOG_FILE"
        echo "Container do banco de dados não está rodando!" | mail -s "ALERTA: HealthCare DB Down" "$ALERT_EMAIL"
        return 1
    }
    
    if ! docker ps | grep -q healthcare-ollama; then
        echo "[$(date)] ALERTA: Container do Ollama não está rodando!" | tee -a "$LOG_FILE"
        echo "Container do Ollama não está rodando!" | mail -s "ALERTA: HealthCare Ollama Down" "$ALERT_EMAIL"
        return 1
    }
    
    return 0
}

# Verificar uso de disco
check_disk() {
    DISK_USAGE=$(df -h / | grep / | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 90 ]; then
        echo "[$(date)] ALERTA: Uso de disco crítico: ${DISK_USAGE}%" | tee -a "$LOG_FILE"
        echo "Uso de disco crítico: ${DISK_USAGE}%" | mail -s "ALERTA: HealthCare Disk Space" "$ALERT_EMAIL"
        return 1
    fi
    
    return 0
}

# Verificar memória
check_memory() {
    MEM_AVAILABLE=$(free -m | grep Mem | awk '{print $7}')
    if [ "$MEM_AVAILABLE" -lt 500 ]; then
        echo "[$(date)] ALERTA: Memória disponível crítica: ${MEM_AVAILABLE}MB" | tee -a "$LOG_FILE"
        echo "Memória disponível crítica: ${MEM_AVAILABLE}MB" | mail -s "ALERTA: HealthCare Memory Low" "$ALERT_EMAIL"
        return 1
    fi
    
    return 0
}

# Executar verificações
check_services
check_disk
check_memory

# Registrar execução normal
echo "[$(date)] Monitoramento executado com sucesso." >> "$LOG_FILE"
EOL

sudo chmod +x "$MONITOR_SCRIPT"
echo "✅ Script de monitoramento criado: $MONITOR_SCRIPT"

# Adicionar ao crontab para execução a cada 5 minutos
(crontab -l 2>/dev/null; echo "*/5 * * * * $MONITOR_SCRIPT") | crontab -
echo "✅ Monitoramento configurado para execução a cada 5 minutos."

# 6. Configurar restart automático
echo "6. Configurando restart automático dos serviços..."

RESTART_SCRIPT="/usr/local/bin/healthcare-restart.sh"
sudo cat > "$RESTART_SCRIPT" << 'EOL'
#!/bin/bash

# Script para reiniciar serviços automaticamente
cd /opt/healthcare
docker-compose -f docker-compose.prod.yml restart
echo "[$(date)] Serviços reiniciados automaticamente." >> /var/log/healthcare/restart.log
EOL

sudo chmod +x "$RESTART_SCRIPT"
echo "✅ Script de restart criado: $RESTART_SCRIPT"

# Adicionar ao crontab para reinício semanal às 4h de domingo
(crontab -l 2>/dev/null; echo "0 4 * * 0 $RESTART_SCRIPT") | crontab -
echo "✅ Restart automático configurado para domingo às 4h."

# 7. Configurar rotação de logs
echo "7. Configurando rotação de logs..."

if command -v logrotate &> /dev/null; then
    LOGROTATE_CONF="/etc/logrotate.d/healthcare"
    sudo cat > "$LOGROTATE_CONF" << 'EOL'
/var/log/healthcare/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
}
EOL
    echo "✅ Rotação de logs configurada."
else
    echo "⚠️ logrotate não encontrado. Instale com: apt-get install logrotate"
fi

# 8. Resumo e próximos passos
echo "=================================================="
echo "✅ Preparação de ambiente concluída!"
echo "✅ Variáveis de ambiente seguras geradas em: $ENV_FILE"
echo "✅ Backup automático configurado: $BACKUP_DIR"
echo "✅ Monitoramento básico configurado"
echo "✅ Rotação de logs configurada"
echo ""
echo "📋 Próximos passos:"
echo "1. Copiar arquivo $ENV_FILE para .env no diretório de produção"
echo "2. Executar 'docker-compose -f docker-compose.prod.yml up -d'"
echo "3. Verificar logs com 'docker-compose -f docker-compose.prod.yml logs -f'"
echo "=================================================="
