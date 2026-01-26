#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="${APP_ROOT:-$(cd -- "${SCRIPT_DIR}/.." && pwd)}"

is_in_docker() {
  [[ -f "/.dockerenv" ]] || [[ "${IN_DOCKER:-}" == "1" ]]
}

run_in_container() {
  if [[ $# -lt 1 ]]; then
    echo "Uso: $0 <healthcare_YYYYMMDDHHMMSS.sql.gz>" >&2
    exit 1
  fi

  local filename
  filename="$1"

  if [[ ! "$filename" =~ ^healthcare_[0-9]{14}\.sql\.gz$ ]]; then
    echo "ERROR: nome de arquivo inválido: $filename" >&2
    exit 1
  fi

  local timestamp
  timestamp="${filename#healthcare_}"
  timestamp="${timestamp%.sql.gz}"

  local backup_dir
  backup_dir="${BACKUPS_DIR:-/app/backups}"

  local backup_file
  backup_file="${backup_dir}/${filename}"

  if [[ ! -f "$backup_file" ]]; then
    echo "ERROR: backup não encontrado: $backup_file" >&2
    exit 1
  fi

  local log_file
  log_file="${backup_dir}/restore_${timestamp}.log"
  exec > >(tee -a "$log_file") 2>&1

  echo "[restore-database] startedAt=$(date -Is)"
  echo "[restore-database] backupFile=${backup_file}"

  local db_url_host db_url_port db_url_user db_url_pass db_url_db
  db_url_host=""; db_url_port=""; db_url_user=""; db_url_pass=""; db_url_db=""
  if [[ -n "${DATABASE_URL:-}" ]]; then
    eval "$(DATABASE_URL="$DATABASE_URL" node - <<'NODE'
const urlStr = process.env.DATABASE_URL;
try {
  const u = new URL(urlStr);
  const host = u.hostname;
  const port = u.port || '5432';
  const user = decodeURIComponent(u.username || '');
  const pass = decodeURIComponent(u.password || '');
  const db = (u.pathname || '').replace(/^\//, '');
  function q(v) { return `'${String(v).replace(/'/g, `'"'"'`)}'`; }
  console.log(`db_url_host=${q(host)}`);
  console.log(`db_url_port=${q(port)}`);
  console.log(`db_url_user=${q(user)}`);
  console.log(`db_url_pass=${q(pass)}`);
  console.log(`db_url_db=${q(db)}`);
} catch {
  process.exit(0);
}
NODE
)" || true
  fi

  local host port user db pass
  host="${POSTGRES_HOST:-${db_url_host:-postgres}}"
  port="${POSTGRES_PORT:-${db_url_port:-5432}}"
  user="${POSTGRES_USER:-${db_url_user:-healthcare}}"
  db="${POSTGRES_DB:-${db_url_db:-healthcare_db}}"
  pass="${POSTGRES_PASSWORD:-${db_url_pass:-}}"

  if [[ -z "$pass" ]]; then
    echo "[restore-database] ERROR: database password is empty (set DATABASE_URL or POSTGRES_PASSWORD)" >&2
    exit 1
  fi

  echo "[restore-database] verifying gzip integrity"
  gunzip -t "$backup_file"

  echo "[restore-database] restoring into database=${db} host=${host}:${port}"
  echo "[restore-database] NOTE: this overwrites existing objects (dump was created with --clean)"

  set +e
  PGPASSWORD="$pass" gunzip -c "$backup_file" | PGPASSWORD="$pass" psql \
    -h "$host" \
    -p "$port" \
    -U "$user" \
    -d "$db" \
    -v ON_ERROR_STOP=1
  rc=$?
  set -e

  if [[ $rc -ne 0 ]]; then
    echo "[restore-database] ERROR: restore failed (exitCode=${rc})" >&2
    exit $rc
  fi

  local user_count patient_count
  user_count=""
  patient_count=""
  set +e
  user_count="$(PGPASSWORD="$pass" psql -h "$host" -p "$port" -U "$user" -d "$db" -tAc 'select count(*) from "User";' 2>/dev/null | tr -d '[:space:]')"
  patient_count="$(PGPASSWORD="$pass" psql -h "$host" -p "$port" -U "$user" -d "$db" -tAc 'select count(*) from "Patient";' 2>/dev/null | tr -d '[:space:]')"
  set -e
  echo "[restore-database] postRestoreCounts users=${user_count:-unknown} patients=${patient_count:-unknown}"

  echo "[restore-database] finishedAt=$(date -Is)"
}

if is_in_docker; then
  run_in_container "$@"
  exit 0
fi

# Host mode: delegate to app container
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found (and not running in container)" >&2
  exit 1
fi

compose_file="${APP_ROOT}/docker-compose.prod.yml"
if [[ -f "$compose_file" ]]; then
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$compose_file" exec -T app bash /app/scripts/restore-database.sh "$@"
    exit $?
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$compose_file" exec -T app bash /app/scripts/restore-database.sh "$@"
    exit $?
  fi
fi

echo "ERROR: could not find docker compose (or compose file)" >&2
exit 1
