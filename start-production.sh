#!/bin/bash
# Legado: delega para scripts/umbrel-start.sh (Docker + Cloudflare Tunnel)
exec "$(dirname "$0")/scripts/umbrel-start.sh"
