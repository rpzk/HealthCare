#!/usr/bin/env bash
# Recupera prisma migrate após P3018 no Umbrel (rodar dentro de ~/HealthCare após git pull).
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
FAILED_MIGRATION="${FAILED_MIGRATION:-20260301000000_add_two_factor_auth}"

run() {
  sudo docker compose -f "$COMPOSE_FILE" exec -T app "$@"
}

echo "=== 1) Marcar migração falha como rolled-back ==="
run npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION" || true

echo "=== 2) Aplicar migrações pendentes ==="
run npx prisma migrate deploy

echo "=== 3) Conferir tabela patient_invites ==="
sudo docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U healthcare -d healthcare_db -c "\\dt patient_invites" || true

echo "Pronto. Teste: curl -s http://127.0.0.1:3000/api/health"
