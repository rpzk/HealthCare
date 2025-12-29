#!/bin/bash

# Script para limpar sessões antigas e forçar re-login
# Uso: ./clear-sessions.sh

set -e

echo "🔄 Limpando sessões antigas..."

# Conectar ao banco e limpar sessions
docker compose -f docker-compose.prod.yml exec -T postgres psql -U healthcare -d healthcare_db <<EOF
-- Limpar todas as sessões (forçar re-login)
DELETE FROM sessions;
SELECT 'Sessões limpas: ' || COUNT(*) FROM sessions;
EOF

echo "✅ Sessões limpas com sucesso!"
echo ""
echo "⚠️  IMPORTANTE:"
echo "1. Faça logout no navegador"
echo "2. Limpe cookies do site healthcare.rafaelpiazenski.com"
echo "3. Faça login novamente"
echo ""
echo "Agora sua sessão terá availableRoles e você poderá trocar entre papéis!"
