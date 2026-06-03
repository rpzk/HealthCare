#!/usr/bin/env bash
# Verifica conectividade com o Umbrel (minipc) na rede local.
# Uso: ./scripts/umbrel-status.sh [IP]
set -euo pipefail

HOST="${1:-192.168.0.16}"

echo "=== Umbrel / HealthCare (${HOST}) ==="

if timeout 2 bash -c "echo >/dev/tcp/${HOST}/22" 2>/dev/null; then
  echo "SSH (22): aberto"
else
  echo "SSH (22): fechado ou host inacessível"
  exit 1
fi

if curl -fsS -m 5 "http://${HOST}/" 2>/dev/null | grep -q umbrelOS; then
  echo "Web Umbrel (80): ok"
else
  echo "Web Umbrel (80): sem resposta ou não é Umbrel"
fi

if curl -fsS -m 5 "http://${HOST}:3000/api/health" >/dev/null 2>&1; then
  echo "HealthCare (3000/api/health): ok"
else
  echo "HealthCare (3000): indisponível — containers provavelmente parados"
fi

echo ""
echo "Conectar: ssh umbrel@${HOST}"
echo "  (senha = mesma do login Umbrel; ssh-copy-id só no notebook, não dentro do Umbrel)"
echo "Subir app: ssh umbrel → cd ~/HealthCare → ./scripts/umbrel-start.sh"
