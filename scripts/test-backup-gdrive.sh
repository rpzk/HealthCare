#!/bin/bash

# Script para testar se as credenciais do Google Drive estão configuradas corretamente
# Usado para debug apenas

set -e

echo "=== TESTE DE CREDENCIAIS GOOGLE DRIVE ==="
echo ""

# 1. Verificar se credenciais existem no banco
echo "[1] Verificando se credenciais existem no banco..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U healthcare -d healthcare_db -c "
SELECT 
  key,
  CASE 
    WHEN encrypted THEN '✅ Criptografada'
    ELSE '⚠️ Sem criptografia'
  END as status,
  LENGTH(value) as tamanho
FROM system_settings 
WHERE key IN ('GDRIVE_SERVICE_ACCOUNT_JSON', 'GDRIVE_FOLDER_ID')
ORDER BY key;
"

echo ""
echo "[2] Verificando se rclone está instalado no container..."
docker compose -f docker-compose.prod.yml exec app which rclone && echo "✅ rclone encontrado" || echo "❌ rclone NOT found"

echo ""
echo "[3] Verificando versão do rclone..."
docker compose -f docker-compose.prod.yml exec app rclone --version 2>&1 | head -3

echo ""
echo "[4] Último log de backup com detalhes do rclone..."
LATEST_RCLONE_LOG=$(docker compose -f docker-compose.prod.yml exec -T app bash -c "ls -1t /app/backups/healthcare/rclone*.log 2>/dev/null | head -1" || echo "")
if [ -n "$LATEST_RCLONE_LOG" ]; then
  docker compose -f docker-compose.prod.yml exec app cat "$LATEST_RCLONE_LOG" | tail -30
else
  echo "❌ Nenhum log rclone encontrado"
fi
