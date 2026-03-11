#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] Iniciando container healthcare-app"

# Aguarda DB se variável DATABASE_URL estiver setada
if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "[entrypoint] DATABASE_URL detectado. Sincronizando schema com prisma db push..."
  npx prisma db push --accept-data-loss || {
    echo "[entrypoint] prisma db push falhou, tentando sem flag..."
    npx prisma db push || echo "[entrypoint] prisma db push falhou (continuando)"
  }
else
  echo "[entrypoint] DATABASE_URL não definido. Pulando sync de schema."
fi

# Garante que Prisma Client esteja gerado (idempotente e rápido se já existir)
echo "[entrypoint] Gerando Prisma Client (se necessário)"
npx prisma generate || true

# Seed completo de produção (fixtures, termos, medicamentos, etc.)
if [[ "${PRODUCTION_SEED:-0}" == "1" ]]; then
  echo "[entrypoint] Executando production seed (fixtures + dados mestres)..."
  SEED_ARGS=""
  [[ "${PRODUCTION_SEED_SKIP_HEAVY:-0}" == "1" ]] && SEED_ARGS="--skip-heavy"
  npx tsx scripts/production-seed.ts $SEED_ARGS || echo "[entrypoint] production seed falhou (continuando)"
  echo "[entrypoint] Production seed concluído."
fi

# Seed opcional de usuários (compatibilidade com SEED_AUTH legado)
if [[ "${SEED_AUTH:-0}" == "1" && "${PRODUCTION_SEED:-0}" != "1" ]]; then
  echo "[entrypoint] Executando seed de autenticação (db:seed)..."
  npx tsx prisma/seed.ts || echo "[entrypoint] seed auth falhou (continuando)"
fi

PORT_TO_USE=${PORT:-3000}
echo "[entrypoint] Iniciando Next.js em porta ${PORT_TO_USE}"
exec node node_modules/next/dist/bin/next start -p "${PORT_TO_USE}"
