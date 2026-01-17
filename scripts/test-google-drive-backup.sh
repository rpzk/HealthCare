#!/bin/bash

################################################################################
#
#  ✅ TESTE RÁPIDO - Backup para Google Drive
#
#  Valida se a configuração de Google Drive está correta
#
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}✅ TESTE - Backup para Google Drive${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Carregar variáveis de ambiente
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado${NC}"
    exit 1
fi

set -a
source "$PROJECT_ROOT/.env"
set +a

# Teste 1: Verificar se GDRIVE_SERVICE_ACCOUNT_JSON está configurado
echo -e "${BLUE}[1/4]${NC} Verificando GDRIVE_SERVICE_ACCOUNT_JSON..."
if [ -z "$GDRIVE_SERVICE_ACCOUNT_JSON" ]; then
    echo -e "${YELLOW}⚠️  GDRIVE_SERVICE_ACCOUNT_JSON vazio - Google Drive desativado${NC}"
    echo "Configure em .env ou execute: ./scripts/setup-google-drive-backup.sh"
    exit 0
else
    echo -e "${GREEN}✅ GDRIVE_SERVICE_ACCOUNT_JSON configurado${NC}"
fi

# Teste 2: Validar JSON
echo ""
echo -e "${BLUE}[2/4]${NC} Validando JSON da Service Account..."
if echo "$GDRIVE_SERVICE_ACCOUNT_JSON" | jq empty 2>/dev/null; then
    echo -e "${GREEN}✅ JSON válido${NC}"
    SERVICE_EMAIL=$(echo "$GDRIVE_SERVICE_ACCOUNT_JSON" | jq -r '.client_email')
    PROJECT_ID=$(echo "$GDRIVE_SERVICE_ACCOUNT_JSON" | jq -r '.project_id')
    echo "   Email: $SERVICE_EMAIL"
    echo "   Projeto: $PROJECT_ID"
else
    echo -e "${RED}❌ JSON inválido!${NC}"
    echo "Verifique o arquivo .env - GDRIVE_SERVICE_ACCOUNT_JSON pode estar corrompido"
    exit 1
fi

# Teste 3: Verificar GDRIVE_FOLDER_ID
echo ""
echo -e "${BLUE}[3/4]${NC} Verificando GDRIVE_FOLDER_ID..."
if [ -z "$GDRIVE_FOLDER_ID" ]; then
    echo -e "${YELLOW}⚠️  GDRIVE_FOLDER_ID vazio${NC}"
    echo "Configure em .env ou execute: ./scripts/setup-google-drive-backup.sh"
    exit 0
else
    echo -e "${GREEN}✅ GDRIVE_FOLDER_ID configurado: $GDRIVE_FOLDER_ID${NC}"
fi

# Teste 4: Verificar rclone
echo ""
echo -e "${BLUE}[4/4]${NC} Verificando rclone..."
if ! command -v rclone >/dev/null 2>&1; then
    echo -e "${RED}❌ rclone não instalado!${NC}"
    exit 1
else
    RCLONE_VERSION=$(rclone version | head -1)
    echo -e "${GREEN}✅ rclone disponível: $RCLONE_VERSION${NC}"
fi

# Teste 5: Testar acesso ao Google Drive (opcional)
echo ""
echo -e "${BLUE}[5/4]${NC} Testando acesso ao Google Drive..."

# Criar arquivo temporário de config
TEMP_CONFIG=$(mktemp)
TEMP_SA=$(mktemp)
trap "rm -f $TEMP_CONFIG $TEMP_SA" EXIT

echo "$GDRIVE_SERVICE_ACCOUNT_JSON" > "$TEMP_SA"

cat > "$TEMP_CONFIG" << EOF
[gdrive]
type = drive
scope = drive
service_account_file = $TEMP_SA
EOF

if rclone --config "$TEMP_CONFIG" about gdrive: --drive-root-folder-id "$GDRIVE_FOLDER_ID" 2>/dev/null | head -5; then
    echo -e "${GREEN}✅ Acesso ao Google Drive funcionando!${NC}"
else
    echo -e "${YELLOW}⚠️  Falha ao acessar Google Drive${NC}"
    echo "Possíveis causas:"
    echo "  1. Email da service account não foi compartilhado com a pasta"
    echo "  2. GDRIVE_FOLDER_ID está incorreto"
    echo "  3. Credenciais expiradas ou inválidas"
    echo ""
    echo "Solução:"
    echo "  ./scripts/setup-google-drive-backup.sh"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ TESTES CONCLUÍDOS${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Próximos passos:"
echo "1. Reconstruir container: docker compose -f docker-compose.prod.yml up -d --build"
echo "2. Executar backup: docker compose -f docker-compose.prod.yml exec app bash /app/scripts/backup-complete.sh"
echo "3. Verificar no Google Drive se os arquivos foram enviados"
echo ""
