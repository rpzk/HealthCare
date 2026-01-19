#!/usr/bin/env bash
set -euo pipefail

# Pipeline local simplificada sem GitHub Actions
# Requisitos: docker, node/npm instalados
# Uso: bash scripts/ci-local.sh

PG_CONTAINER=hc-ci-pg
PG_IMAGE=postgres:15-alpine
PG_PORT=55432
DB_URL="postgresql://postgres:postgres@localhost:${PG_PORT}/healthcare_test"
APP_LOG=app.local.log

cleanup() {
  echo "[cleanup] encerrando..."
  if [[ -f app.pid ]]; then
    if kill -0 $(cat app.pid) 2>/dev/null; then kill $(cat app.pid) || true; fi
    rm -f app.pid || true
  fi
  if docker ps -a --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
    docker stop ${PG_CONTAINER} >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

if docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  echo "[postgres] container já em execução: ${PG_CONTAINER}" >&2
  exit 1
fi

echo "[postgres] iniciando container em porta ${PG_PORT}..."
docker run -d --rm \
  --name ${PG_CONTAINER} \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=healthcare_test \
  -p ${PG_PORT}:5432 \
  ${PG_IMAGE} >/dev/null

# Espera readiness
for i in $(seq 1 40); do
  if docker exec ${PG_CONTAINER} pg_isready -U postgres >/dev/null 2>&1; then
    echo "[postgres] pronto (tentativa $i)"; break
  fi
  sleep 1
  if [[ $i -eq 40 ]]; then echo "[postgres] timeout" >&2; exit 1; fi
done

export DATABASE_URL=${DB_URL}
export NEXTAUTH_SECRET=testsecret
export NEXTAUTH_URL=http://localhost:3000
export OTEL_TRACING_DISABLED=1
export DISABLE_REDIS=1

echo "[deps] instalando (npm ci)..."
npm ci

echo "[prisma] generate + migrate deploy"
npm run db:generate
npx prisma migrate deploy

echo "[seed] usuários auth"
node scripts/ci-seed-auth.js

echo "[typecheck]"
npm run type-check

echo "[build]"
npm run build

echo "[db quick test]"
node scripts/ci-patient-basic.js

echo "[app] iniciando em background"
nohup npm start > ${APP_LOG} 2>&1 &
echo $! > app.pid
sleep 1
if ! kill -0 $(cat app.pid) 2>/dev/null; then
  echo "[app] saiu imediatamente" >&2
  tail -n 120 ${APP_LOG} || true
  exit 1
fi

echo "[health] aguardando 200..."
for i in $(seq 1 50); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health || echo 000)
  if [[ "$code" == "200" ]]; then echo "[health] OK (tentativa $i)"; break; fi
  if (( i % 5 == 0 )); then echo "[health] tentativa $i code=$code"; tail -n 15 ${APP_LOG} || true; fi
  sleep 2
  if [[ $i -eq 50 ]]; then
    echo "[health] falhou" >&2
    tail -n 200 ${APP_LOG} || true
    exit 1
  fi
done

echo "[tests] auth + rbac + export"
node test-patients-auth.js
node test-rbac-patients.js
node test-export-zip-automated.js

echo "[metrics] snapshot (best effort)"
curl -fsS http://localhost:3000/api/metrics | head -n 30 || echo 'metrics indisponíveis'

echo "[done] sucesso"
