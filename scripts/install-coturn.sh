#!/bin/bash

# Script de instalação rápida do Coturn para HealthCare
# Uso: sudo bash install-coturn.sh

set -e

echo "========================================="
echo "  Instalação do TURN Server (Coturn)"
echo "  HealthCare Telemedicine System"
echo "========================================="
echo ""

# Verificar se é root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Este script precisa ser executado como root (use sudo)"
  exit 1
fi

# Detectar sistema operacional
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "❌ Não foi possível detectar o sistema operacional"
    exit 1
fi

echo "📋 Sistema detectado: $OS"
echo ""

# Instalar Coturn
echo "📦 Instalando Coturn..."
case $OS in
    ubuntu|debian)
        apt update
        apt install -y coturn
        ;;
    fedora|centos|rhel)
        yum install -y coturn || dnf install -y coturn
        ;;
    *)
        echo "❌ Sistema operacional não suportado: $OS"
        echo "Instale manualmente: apt install coturn (Ubuntu/Debian)"
        exit 1
        ;;
esac

# Obter IP público
echo ""
echo "🌐 Detectando IP público..."
EXTERNAL_IP=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || echo "")

if [ -z "$EXTERNAL_IP" ]; then
    echo "⚠️  Não foi possível detectar IP público automaticamente"
    read -p "Digite seu IP público manualmente: " EXTERNAL_IP
fi

echo "✓ IP público: $EXTERNAL_IP"

# Gerar senha segura
echo ""
echo "🔐 Gerando credenciais seguras..."
AUTH_SECRET=$(openssl rand -base64 32)
TURN_USER="healthcare"
TURN_PASS=$(openssl rand -base64 16)

echo "✓ Usuário: $TURN_USER"
echo "✓ Senha: $TURN_PASS"
echo "✓ Auth Secret: $AUTH_SECRET"

# Criar diretório de logs
mkdir -p /var/log/turnserver
chown turnserver:turnserver /var/log/turnserver

# Backup de configuração existente
if [ -f /etc/turnserver.conf ]; then
    cp /etc/turnserver.conf /etc/turnserver.conf.backup.$(date +%F)
    echo "✓ Backup da configuração antiga criado"
fi

# Criar configuração
echo ""
echo "📝 Criando configuração..."
cat > /etc/turnserver.conf << EOF
# Coturn Configuration - HealthCare Telemedicine
listening-ip=0.0.0.0
external-ip=$EXTERNAL_IP

listening-port=3478
tls-listening-port=5349

lt-cred-mech
use-auth-secret
static-auth-secret=$AUTH_SECRET

user=$TURN_USER:$TURN_PASS

realm=healthcare.local
server-name=healthcare.local

log-file=/var/log/turnserver/turnserver.log
verbose

max-bps=625000
total-quota=100
stale-nonce=600

min-port=49152
max-port=65535

fingerprint
mobility

denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
allowed-peer-ip=10.0.0.0-10.255.255.255
allowed-peer-ip=172.16.0.0-172.31.255.255
allowed-peer-ip=192.168.0.0-192.168.255.255

no-tcp-relay
no-cli
no-stdout-log
EOF

echo "✓ Configuração criada em /etc/turnserver.conf"

# Configurar firewall
echo ""
echo "🔥 Configurando firewall..."

if command -v ufw &> /dev/null; then
    ufw allow 3478/tcp
    ufw allow 3478/udp
    ufw allow 5349/tcp
    ufw allow 5349/udp
    ufw allow 49152:65535/udp
    echo "✓ Regras UFW adicionadas"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=3478/tcp
    firewall-cmd --permanent --add-port=3478/udp
    firewall-cmd --permanent --add-port=5349/tcp
    firewall-cmd --permanent --add-port=5349/udp
    firewall-cmd --permanent --add-port=49152-65535/udp
    firewall-cmd --reload
    echo "✓ Regras firewalld adicionadas"
else
    echo "⚠️  Firewall não detectado. Configure manualmente:"
    echo "   - TCP/UDP 3478 (TURN)"
    echo "   - TCP/UDP 5349 (TURNS)"
    echo "   - UDP 49152-65535 (Media)"
fi

# Habilitar e iniciar serviço
echo ""
echo "🚀 Iniciando Coturn..."
systemctl enable coturn
systemctl restart coturn

# Verificar status
sleep 2
if systemctl is-active --quiet coturn; then
    echo "✅ Coturn está rodando!"
else
    echo "❌ Erro ao iniciar Coturn. Verifique logs:"
    echo "   journalctl -u coturn -n 50"
    exit 1
fi

# Exibir configuração para .env
echo ""
echo "========================================="
echo "  ✅ INSTALAÇÃO CONCLUÍDA!"
echo "========================================="
echo ""
echo "📋 Adicione ao arquivo .env do Next.js:"
echo ""
echo "NEXT_PUBLIC_ICE=\"stun:stun.l.google.com:19302;turn:$EXTERNAL_IP:3478,$TURN_USER,$TURN_PASS\""
echo ""
echo "========================================="
echo ""
echo "🧪 TESTE DE CONECTIVIDADE:"
echo "1. Acesse: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/"
echo "2. Adicione seu servidor TURN:"
echo "   - URI: turn:$EXTERNAL_IP:3478"
echo "   - Username: $TURN_USER"
echo "   - Password: $TURN_PASS"
echo "3. Clique em 'Gather candidates'"
echo "4. Deve aparecer candidates do tipo 'relay'"
echo ""
echo "📊 MONITORAMENTO:"
echo "- Status: systemctl status coturn"
echo "- Logs: tail -f /var/log/turnserver/turnserver.log"
echo "- Reiniciar: systemctl restart coturn"
echo ""
echo "🔒 SEGURANÇA (RECOMENDADO):"
echo "Para produção, configure certificado SSL:"
echo "1. Instalar certbot: apt install certbot"
echo "2. Obter certificado: certbot certonly --standalone -d seu-dominio.com"
echo "3. Editar /etc/turnserver.conf:"
echo "   cert=/etc/letsencrypt/live/seu-dominio.com/fullchain.pem"
echo "   pkey=/etc/letsencrypt/live/seu-dominio.com/privkey.pem"
echo "4. Reiniciar: systemctl restart coturn"
echo ""
echo "========================================="
echo ""

# Salvar credenciais em arquivo seguro
CREDS_FILE="/root/coturn-credentials-$(date +%F).txt"
cat > "$CREDS_FILE" << EOF
Credenciais do TURN Server - $(date)
=====================================

IP Externo: $EXTERNAL_IP
Auth Secret: $AUTH_SECRET
Usuário: $TURN_USER
Senha: $TURN_PASS

Configuração .env:
NEXT_PUBLIC_ICE="stun:stun.l.google.com:19302;turn:$EXTERNAL_IP:3478,$TURN_USER,$TURN_PASS"

Arquivo de configuração: /etc/turnserver.conf
Logs: /var/log/turnserver/turnserver.log
EOF

chmod 600 "$CREDS_FILE"
echo "💾 Credenciais salvas em: $CREDS_FILE"
echo ""
