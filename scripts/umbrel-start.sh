#!/usr/bin/env bash
# Inicia HealthCare (Docker) + Cloudflare Tunnel no Umbrel/minipc.
# Rodar NO SERVIDOR após: ssh umbrel
set -euo pipefail

HEALTHCARE_DIR="${HEALTHCARE_DIR:-/home/umbrel/HealthCare}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
CLOUDFLARED_CONFIG="${CLOUDFLARED_CONFIG:-/home/umbrel/.cloudflared/config.yml}"
CLOUDFLARED_BIN="${CLOUDFLARED_BIN:-$HOME/.local/bin/cloudflared}"
TUNNEL_ID="${TUNNEL_ID:-2fc60ec5-d334-4c74-870f-5f25164a94be}"

cd "$HEALTHCARE_DIR"

install_cloudflared() {
  if [ -x "$CLOUDFLARED_BIN" ]; then
    return 0
  fi
  mkdir -p "$HOME/.local/bin"
  arch="$(uname -m)"
  case "$arch" in
    x86_64) cf_arch="amd64" ;;
    aarch64|arm64) cf_arch="arm64" ;;
    *) echo "Arquitetura não suportada: $arch"; exit 1 ;;
  esac
  echo "Instalando cloudflared em $CLOUDFLARED_BIN ..."
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${cf_arch}" -o "$CLOUDFLARED_BIN"
  chmod +x "$CLOUDFLARED_BIN"
}

echo "=== Docker (HealthCare) ==="
sudo docker compose -f "$COMPOSE_FILE" up -d

echo "Aguardando app na porta 3000..."
for i in $(seq 1 60); do
  if curl -fsS -m 2 http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "App OK (tentativa $i)"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "App não respondeu em 3000. Logs:"
    sudo docker compose -f "$COMPOSE_FILE" logs app --tail 40
    exit 1
  fi
  sleep 5
done

echo "=== Cloudflare Tunnel ==="
if [ ! -f "$CLOUDFLARED_CONFIG" ]; then
  echo "Config ausente: $CLOUDFLARED_CONFIG"
  exit 1
fi
install_cloudflared
pkill -f "cloudflared tunnel" 2>/dev/null || true
nohup "$CLOUDFLARED_BIN" --config "$CLOUDFLARED_CONFIG" tunnel run "$TUNNEL_ID" \
  > /tmp/cloudflared.log 2>&1 &
sleep 3
if pgrep -f "cloudflared tunnel" >/dev/null; then
  echo "cloudflared em execução (log: /tmp/cloudflared.log)"
else
  echo "cloudflared não iniciou. Últimas linhas do log:"
  tail -20 /tmp/cloudflared.log 2>/dev/null || true
  exit 1
fi

echo ""
echo "Local:  http://192.168.0.16:3000/api/health"
echo "Público: https://healthcare.rafaelpiazenski.com"
