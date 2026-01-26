#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="${APP_ROOT:-$(cd -- "${SCRIPT_DIR}/.." && pwd)}"

is_in_docker() {
  [[ -f "/.dockerenv" ]] || [[ "${IN_DOCKER:-}" == "1" ]]
}

run_in_container() {
  local timestamp
  timestamp="$(date +"%Y%m%d%H%M%S")"

  local backup_dir
  backup_dir="${BACKUPS_DIR:-/app/backups}"

  mkdir -p "$backup_dir"

  local log_file
  log_file="${backup_dir}/backup_${timestamp}.log"

  exec > >(tee -a "$log_file") 2>&1

  echo "[backup-complete] startedAt=$(date -Is)"
  echo "[backup-complete] backupDir=${backup_dir}"

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
    echo "[backup-complete] ERROR: database password is empty (set DATABASE_URL or POSTGRES_PASSWORD)" >&2
    exit 1
  fi

  echo "[backup-complete] dbTarget=${user}@${host}:${port}/${db}"

  local user_count patient_count
  user_count=""
  patient_count=""
  set +e
  user_count="$(PGPASSWORD="$pass" psql -h "$host" -p "$port" -U "$user" -d "$db" -tAc 'select count(*) from "User";' 2>/dev/null | tr -d '[:space:]')"
  patient_count="$(PGPASSWORD="$pass" psql -h "$host" -p "$port" -U "$user" -d "$db" -tAc 'select count(*) from "Patient";' 2>/dev/null | tr -d '[:space:]')"
  set -e
  echo "[backup-complete] preDumpCounts users=${user_count:-unknown} patients=${patient_count:-unknown}"

  local db_file config_file certs_file manifest_file status_file
  db_file="${backup_dir}/healthcare_${timestamp}.sql.gz"
  config_file="${backup_dir}/config_${timestamp}.tar.gz"
  certs_file="${backup_dir}/certs_${timestamp}.tar.gz"
  manifest_file="${backup_dir}/manifest_${timestamp}.json"
  status_file="${backup_dir}/status_${timestamp}.json"

  echo "[backup-complete] creating database backup: ${db_file}"
  PGPASSWORD="$pass" pg_dump \
    -h "$host" \
    -p "$port" \
    -U "$user" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --format=plain \
    "$db" \
    | gzip -c > "$db_file"

  echo "[backup-complete] verifying gzip integrity"
  gunzip -t "$db_file"

  echo "[backup-complete] creating config archive: ${config_file}"
  (
    cd /app || exit 0
    tar -czf "$config_file" \
      --ignore-failed-read \
      .env.production \
      docker-compose.prod.yml \
      prisma/schema.prisma \
      package.json \
      package-lock.json \
      2>/dev/null || true
  )

  echo "[backup-complete] creating certificates/uploads archive: ${certs_file}"
  (
    cd /app || exit 0
    tar -czf "$certs_file" \
      --ignore-failed-read \
      uploads/certificates \
      uploads/recordings \
      2>/dev/null || true
  )

  echo "[backup-complete] writing manifest: ${manifest_file}"
  BACKUP_TIMESTAMP="$timestamp" BACKUPS_DIR="$backup_dir" BACKUP_USER_COUNT="${user_count:-}" BACKUP_PATIENT_COUNT="${patient_count:-}" node - <<'NODE'
const fs = require('fs');
const path = require('path');

const backupDir = process.env.BACKUPS_DIR || '/app/backups';
const timestamp = process.env.BACKUP_TIMESTAMP;
if (!timestamp) process.exit(2);

function statSafe(p) {
  try {
    const s = fs.statSync(p);
    return { size: s.size, mtime: s.mtime.toISOString() };
  } catch {
    return null;
  }
}

const files = {
  db: `healthcare_${timestamp}.sql.gz`,
  config: `config_${timestamp}.tar.gz`,
  certs: `certs_${timestamp}.tar.gz`,
  manifest: `manifest_${timestamp}.json`,
  status: `status_${timestamp}.json`,
  log: `backup_${timestamp}.log`,
  rcloneLog: `rclone_${timestamp}.log`,
};

const manifest = {
  timestamp,
  createdAt: new Date().toISOString(),
  backupDir,
  preDumpCounts: {
    users: process.env.BACKUP_USER_COUNT ? Number(process.env.BACKUP_USER_COUNT) : null,
    patients: process.env.BACKUP_PATIENT_COUNT ? Number(process.env.BACKUP_PATIENT_COUNT) : null,
  },
  files: Object.fromEntries(Object.entries(files).map(([k, name]) => [k, { name, stat: statSafe(path.join(backupDir, name)) }]))
};

fs.writeFileSync(path.join(backupDir, files.manifest), JSON.stringify(manifest, null, 2));
NODE

  echo "[backup-complete] writing status: ${status_file}"
  BACKUP_TIMESTAMP="$timestamp" BACKUPS_DIR="$backup_dir" GDRIVE_FOLDER_ID="${GDRIVE_FOLDER_ID:-}" node - <<'NODE'
const fs = require('fs');
const path = require('path');

const backupDir = process.env.BACKUPS_DIR || '/app/backups';
const timestamp = process.env.BACKUP_TIMESTAMP;
if (!timestamp) process.exit(2);

const status = {
  timestamp,
  dbBackupFile: `healthcare_${timestamp}.sql.gz`,
  googleDriveUploaded: false,
  googleDriveFolderId: process.env.GDRIVE_FOLDER_ID || null,
  createdAt: new Date().toISOString(),
};

fs.writeFileSync(path.join(backupDir, `status_${timestamp}.json`), JSON.stringify(status, null, 2));
NODE

  # Optional: upload to Google Drive via rclone (best-effort)
  if [[ -n "${GDRIVE_SERVICE_ACCOUNT_FILE:-}" && -n "${GDRIVE_FOLDER_ID:-}" && -f "${GDRIVE_SERVICE_ACCOUNT_FILE:-}" ]]; then
    local rclone_conf rclone_log
    rclone_conf="/tmp/rclone-backup-${timestamp}.conf"
    rclone_log="${backup_dir}/rclone_${timestamp}.log"

    echo "[backup-complete] attempting google drive upload (best-effort)"
    printf "\n[gdrive]\ntype = drive\nscope = drive\nservice_account_file = %s\n" "$GDRIVE_SERVICE_ACCOUNT_FILE" > "$rclone_conf"

    set +e
    rclone copy "$backup_dir" gdrive: \
      --config="$rclone_conf" \
      --drive-root-folder-id="$GDRIVE_FOLDER_ID" \
      ${GDRIVE_IMPERSONATE:+--drive-impersonate="$GDRIVE_IMPERSONATE"} \
      --transfers=2 \
      --checkers=4 \
      --fast-list \
      --log-file="$rclone_log" \
      --log-level=INFO \
      --include="healthcare_${timestamp}.sql.gz" \
      --include="config_${timestamp}.tar.gz" \
      --include="certs_${timestamp}.tar.gz" \
      --include="manifest_${timestamp}.json" \
      --exclude="*.log"
    rc=$?
    set -e

    rm -f "$rclone_conf" || true

    if [[ $rc -eq 0 ]]; then
      echo "[backup-complete] google drive upload: OK"
      BACKUP_TIMESTAMP="$timestamp" BACKUPS_DIR="$backup_dir" node - <<'NODE'
const fs = require('fs');
const path = require('path');

const backupDir = process.env.BACKUPS_DIR || '/app/backups';
const timestamp = process.env.BACKUP_TIMESTAMP;
if (!timestamp) process.exit(2);

const statusPath = path.join(backupDir, `status_${timestamp}.json`);
let status = {};
try { status = JSON.parse(fs.readFileSync(statusPath, 'utf8')); } catch {}
status.googleDriveUploaded = true;
status.googleDriveUploadedAt = new Date().toISOString();
fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
NODE
    else
      echo "[backup-complete] google drive upload: FAILED (see rclone log)"
    fi
  else
    echo "[backup-complete] google drive upload: not configured"
  fi

  # Retention policy (best-effort): remove old backups
  local retention_days
  retention_days="${BACKUP_RETENTION_DAYS:-7}"
  if [[ "$retention_days" =~ ^[0-9]+$ ]] && [[ "$retention_days" -gt 0 ]]; then
    echo "[backup-complete] retention: deleting files older than ${retention_days} days"
    find "$backup_dir" -type f \( \
      -name 'healthcare_*.sql.gz' -o \
      -name 'config_*.tar.gz' -o \
      -name 'certs_*.tar.gz' -o \
      -name 'manifest_*.json' -o \
      -name 'status_*.json' -o \
      -name 'backup_*.log' -o \
      -name 'rclone_*.log' -o \
      -name 'rclone_reupload_*.log' \
    \) -mtime "+${retention_days}" -delete || true
  fi

  echo "[backup-complete] finishedAt=$(date -Is)"
}

if is_in_docker; then
  run_in_container
  exit 0
fi

# Host mode: delegate to app container
if ! command -v docker >/dev/null 2>&1; then
  echo "[backup-complete] ERROR: docker not found (and not running in container)" >&2
  exit 1
fi

compose_file="${APP_ROOT}/docker-compose.prod.yml"
if [[ -f "$compose_file" ]]; then
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$compose_file" exec -T app bash /app/scripts/backup-complete.sh
    exit $?
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$compose_file" exec -T app bash /app/scripts/backup-complete.sh
    exit $?
  fi
fi

echo "[backup-complete] ERROR: could not find docker compose (or compose file)" >&2
exit 1
