#!/bin/bash

################################################################################
#
#  🔐 SETUP DE BACKUP PARA GOOGLE DRIVE
#
#  Este script configura o sistema de backup para enviar arquivos
#  automaticamente para uma pasta no Google Drive
#
#  Pré-requisitos:
#  1. Uma conta Google (pessoal ou de empresa)
#  2. Um projeto no Google Cloud Console
#  3. Uma Service Account criada
#  4. Uma chave JSON baixada
#  5. Uma pasta no Google Drive
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
KEY_FILE="$SCRIPT_DIR/google-drive-key.json"
ENV_FILE="$PROJECT_ROOT/.env"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔐 SETUP DE BACKUP PARA GOOGLE DRIVE${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar se arquivo .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado em: $ENV_FILE${NC}"
    echo "Execute primeiro: cp .env.example .env"
    exit 1
fi

# Passo 1: Verificar se arquivo JSON existe
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}⚠️  Arquivo de chave não encontrado: $KEY_FILE${NC}"
    echo ""
    echo "Para obter a chave JSON:"
    echo "1. Vá para: https://console.cloud.google.com/iam-admin/serviceaccounts"
    echo "2. Selecione ou crie um projeto"
    echo "3. Clique em 'Criar conta de serviço'"
    echo "4. Preencha os dados e clique em 'Continuar'"
    echo "5. Atribua o papel 'Editor' e continue"
    echo "6. Na guia 'Chaves', clique em 'Adicionar chave' > 'Criar nova chave'"
    echo "7. Selecione 'JSON' e clique em 'Criar'"
    echo "8. Salve o arquivo como: $KEY_FILE"
    echo ""
    read -p "Pressione Enter quando tiver salvo o arquivo JSON..."
    
    if [ ! -f "$KEY_FILE" ]; then
        echo -e "${RED}❌ Arquivo JSON ainda não encontrado!${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Arquivo de chave encontrado${NC}"
echo ""

# Validar JSON
if ! jq empty "$KEY_FILE" 2>/dev/null; then
    echo -e "${RED}❌ Arquivo JSON inválido!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ JSON válido${NC}"
echo ""

# Passo 2: Extrair email da service account
SERVICE_ACCOUNT_EMAIL=$(jq -r '.client_email' "$KEY_FILE")
echo "Email da Service Account: $SERVICE_ACCOUNT_EMAIL"
echo ""
echo "Agora você precisa:"
echo "1. Criar uma pasta em Google Drive para os backups"
echo "2. Abrir a pasta > Compartilhar"
echo "3. Adicionar: $SERVICE_ACCOUNT_EMAIL (com acesso 'Editor')"
echo ""
read -p "Pressione Enter quando tiver compartilhado a pasta..."

# Passo 3: Obter Folder ID
echo ""
echo -e "${BLUE}📁 OBTENDO FOLDER ID${NC}"
echo "Abra a pasta no Google Drive:"
echo "A URL terá este formato: drive.google.com/drive/folders/{FOLDER_ID}"
echo ""
read -p "Cole o FOLDER_ID aqui (ou deixe em branco): " FOLDER_ID

if [ -z "$FOLDER_ID" ]; then
    echo -e "${YELLOW}⚠️  FOLDER_ID não fornecido. Você pode configurar depois manualmente.${NC}"
else
    # Validar Folder ID (deve ter aprox 33 caracteres alfanuméricos)
    if [[ ! "$FOLDER_ID" =~ ^[a-zA-Z0-9_-]{30,}$ ]]; then
        echo -e "${YELLOW}⚠️  FOLDER_ID parece inválido, mas continuando...${NC}"
    fi
fi

echo ""

# Passo 4: Converter JSON para formato de linha única
echo -e "${BLUE}⚙️  COMPRIMINDO ARQUIVO JSON...${NC}"
JSON_COMPRESSED=$(jq -c . "$KEY_FILE")

# Passo 5: Atualizar .env
echo -e "${BLUE}⚙️  ATUALIZANDO .env...${NC}"

# Usar sed para atualizar as variáveis (compatível com macOS e Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|GDRIVE_SERVICE_ACCOUNT_JSON=\".*\"|GDRIVE_SERVICE_ACCOUNT_JSON='$JSON_COMPRESSED'|" "$ENV_FILE"
else
    # Linux
    sed -i "s|GDRIVE_SERVICE_ACCOUNT_JSON=\".*\"|GDRIVE_SERVICE_ACCOUNT_JSON='$JSON_COMPRESSED'|" "$ENV_FILE"
fi

if [ -n "$FOLDER_ID" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|GDRIVE_FOLDER_ID=\".*\"|GDRIVE_FOLDER_ID=\"$FOLDER_ID\"|" "$ENV_FILE"
    else
        sed -i "s|GDRIVE_FOLDER_ID=\".*\"|GDRIVE_FOLDER_ID=\"$FOLDER_ID\"|" "$ENV_FILE"
    fi
fi

echo -e "${GREEN}✅ .env atualizado${NC}"
echo ""

# Passo 6: Validação final
echo -e "${BLUE}⚙️  VALIDANDO CONFIGURAÇÃO...${NC}"

# Verificar se foi atualizado
if grep -q "GDRIVE_SERVICE_ACCOUNT_JSON=.*client_email" "$ENV_FILE"; then
    echo -e "${GREEN}✅ Variável GDRIVE_SERVICE_ACCOUNT_JSON configurada${NC}"
else
    echo -e "${YELLOW}⚠️  Não foi possível atualizar GDRIVE_SERVICE_ACCOUNT_JSON automaticamente${NC}"
    echo "Atualize manualmente em $ENV_FILE:"
    echo "GDRIVE_SERVICE_ACCOUNT_JSON='$JSON_COMPRESSED'"
fi

if [ -n "$FOLDER_ID" ] && grep -q "GDRIVE_FOLDER_ID=\"$FOLDER_ID\"" "$ENV_FILE"; then
    echo -e "${GREEN}✅ Variável GDRIVE_FOLDER_ID configurada: $FOLDER_ID${NC}"
elif [ -z "$FOLDER_ID" ]; then
    echo -e "${YELLOW}⚠️  GDRIVE_FOLDER_ID não foi preenchido${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ SETUP CONCLUÍDO!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Próximos passos:"
echo "1. Reconstruir o container: docker compose -f docker-compose.prod.yml up -d --build"
echo "2. Testar o backup: docker compose -f docker-compose.prod.yml exec app bash /app/scripts/backup-complete.sh"
echo ""
echo "O script enviará os arquivos para Google Drive automaticamente!"
echo ""

# Limpeza
unset JSON_COMPRESSED SERVICE_ACCOUNT_EMAIL
