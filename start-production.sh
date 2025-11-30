#!/bin/bash
# Script para iniciar HealthCare + Cloudflare Tunnel
# Adicionar ao cron ou systemd para auto-start

cd /home/umbrel/HealthCare

# Iniciar containers Docker
sudo docker compose up -d postgres redis

# Aguardar banco ficar pronto
sleep 5

# Iniciar app Next.js
pkill -f "next start" 2>/dev/null
nohup npm run start > /tmp/healthcare-app.log 2>&1 &

# Aguardar app iniciar
sleep 5

# Iniciar Cloudflare Tunnel
pkill cloudflared 2>/dev/null
nohup cloudflared tunnel run healthcare > /tmp/cloudflared.log 2>&1 &

echo "✅ HealthCare iniciado em https://healthcare.rafaelpiazenski.com"
