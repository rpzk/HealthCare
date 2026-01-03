#!/bin/bash

# ============================================
# SETUP SYSTEMD TIMER FOR AUTO BACKUPS
# Configura backup automático com systemd
# ============================================

set -e

echo "🔄 CONFIGURANDO BACKUPS AUTOMÁTICOS (systemd timer)"
echo "===================================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="${SCRIPT_DIR}/.systemd/healthcare-backup.service"
TIMER_FILE="${SCRIPT_DIR}/.systemd/healthcare-backup.timer"

# Verificar se arquivos existem
if [ ! -f "$SERVICE_FILE" ] || [ ! -f "$TIMER_FILE" ]; then
    echo "❌ Arquivos de systemd não encontrados"
    exit 1
fi

# Verificar se é root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Este script requer privilégios de root"
    echo "Execute com: sudo bash $0"
    exit 1
fi

echo "📋 Instalando arquivos de systemd..."
echo ""

# Copiar arquivos
cp "$SERVICE_FILE" /etc/systemd/system/healthcare-backup.service
cp "$TIMER_FILE" /etc/systemd/system/healthcare-backup.timer

echo "✅ Arquivos copiados para /etc/systemd/system/"
echo ""

# Recarregar daemon
echo "🔄 Recarregando systemd daemon..."
systemctl daemon-reload

echo ""
echo "🚀 Habilitando e iniciando timer..."
systemctl enable healthcare-backup.timer
systemctl start healthcare-backup.timer

echo ""
echo "✅ Timer configurado com sucesso!"
echo ""
echo "📅 Detalhes:"
echo "   Frequência: Diariamente às 02:00 AM"
echo "   Serviço: healthcare-backup"
echo "   Timer: healthcare-backup.timer"
echo ""
echo "🔍 Comandos úteis:"
echo ""
echo "   Ver status:"
echo "   systemctl status healthcare-backup.timer"
echo ""
echo "   Ver próxima execução:"
echo "   systemctl list-timers healthcare-backup.timer"
echo ""
echo "   Ver logs da última execução:"
echo "   journalctl -u healthcare-backup.service -n 50"
echo ""
echo "   Desabilitar backups automáticos:"
echo "   systemctl disable healthcare-backup.timer"
echo "   systemctl stop healthcare-backup.timer"
echo ""
echo "   Executar backup manualmente agora:"
echo "   systemctl start healthcare-backup.service"
echo ""
