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

# Seed opcional de usuários com senha (para logar no app) se habilitado
if [[ "${SEED_AUTH:-0}" == "1" ]]; then
  echo "[entrypoint] Executando seed de autenticação (ci-seed-auth.js)"
  node scripts/ci-seed-auth.js || echo "[entrypoint] seed auth falhou (continuando)"
fi

PORT_TO_USE=${PORT:-3000}
echo "[entrypoint] Iniciando Next.js em porta ${PORT_TO_USE}"
exec node node_modules/next/dist/bin/next start -p "${PORT_TO_USE}"
