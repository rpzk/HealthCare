#!/bin/bash

# ============================================
# SETUP AUTOMATIC DAILY BACKUPS
# Configure cron para backups automáticos
# ============================================

set -e

echo "🔄 CONFIGURANDO BACKUPS AUTOMÁTICOS DIÁRIOS"
echo "==========================================="
echo ""

SCRIPT_PATH="/home/umbrel/HealthCare/scripts/backup-database.sh"
CRON_SCHEDULE="0 2 * * *"  # 02:00 todo dia

# Verificar se script existe
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Script não encontrado: $SCRIPT_PATH"
    exit 1
fi

# Criar cronjob
(crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH" || true; echo "$CRON_SCHEDULE $SCRIPT_PATH >> /home/umbrel/backups/healthcare/cron.log 2>&1") | crontab -

echo ""
echo "✅ Backup automático configurado!"
echo ""
echo "📅 Agendamento:"
echo "   Frequência: Diariamente"
echo "   Horário: 02:00 AM"
echo "   Comando: $SCRIPT_PATH"
echo "   Log: /home/umbrel/backups/healthcare/cron.log"
echo ""
echo "📂 Backups serão salvos em:"
echo "   /home/umbrel/backups/healthcare/"
echo ""
echo "🔍 Para verificar crontab:"
echo "   crontab -l | grep backup-database"
echo ""
echo "⚠️  Para desabilitar backups automáticos:"
echo "   crontab -e"
echo "   (remova a linha do backup)"
echo ""
