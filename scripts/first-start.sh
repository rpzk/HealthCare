#!/usr/bin/env bash
set -euo pipefail

# Primeiro start local: sobe serviços, aplica schema e seed

echo "[first-start] Verificando .env..."
if [ ! -f .env ]; then
  echo "Arquivo .env não encontrado. Copiando .env.example para .env..."
  cp .env.example .env
  echo "Revise o arquivo .env e ajuste POSTGRES_PASSWORD / NEXTAUTH_SECRET / NEXTAUTH_URL."
fi

echo "[first-start] Subindo serviços com Docker Compose (forçando rebuild/recreate)..."
docker compose up -d --build --force-recreate

# Aguarda Postgres responder
echo "[first-start] Aguardando Postgres ficar pronto..."
retries=30
until docker compose exec -T postgres pg_isready -U healthcare -d healthcare_db >/dev/null 2>&1; do
  ((retries--)) || { echo "Postgres não respondeu a tempo"; exit 1; }
  sleep 2
  echo -n "."
done

echo "\n[first-start] Aplicando schema (db:push)..."
docker compose exec -T app sh -lc 'test -f /app/prisma/schema.prisma && npx prisma db push --schema /app/prisma/schema.prisma || (echo "Schema não encontrado em /app/prisma. Verifique build." && ls -la /app && exit 1)'

echo "[first-start] Rodando seed (db:seed)..."
docker compose exec -T app npm run db:seed || true

echo "[first-start] Concluído. Acesse o app em: ${NEXTAUTH_URL:-http://localhost:3000}"
