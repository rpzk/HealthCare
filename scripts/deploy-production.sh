#!/bin/bash

# Script de deployment final do HealthCare em produção
# Este script deve ser executado no servidor de produção após a preparação

echo "🚀 Deployment Final - HealthCare"
echo "==============================="

# Definir variáveis
APP_DIR="/opt/healthcare"
ENV_FILE=".env.production"
STAGING_PORT=3001
PROD_PORT=3000

# 1. Verificar se o ambiente foi preparado
echo "1. Verificando preparação do ambiente..."

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Arquivo $ENV_FILE não encontrado!"
    echo "Execute primeiro o script prepare-production.sh"
    exit 1
fi

# 2. Configurar ambiente de staging para testes
echo "2. Configurando ambiente de staging para testes finais..."

# Criar diretório de staging
STAGING_DIR="${APP_DIR}_staging"
if [ ! -d "$STAGING_DIR" ]; then
    mkdir -p "$STAGING_DIR"
    echo "✅ Diretório de staging criado: $STAGING_DIR"
else
    echo "✅ Diretório de staging já existe: $STAGING_DIR"
fi

# Copiar arquivos para staging
cp -r * "$STAGING_DIR/"
cp "$ENV_FILE" "$STAGING_DIR/.env"

# Ajustar configuração para staging
sed -i "s/NEXTAUTH_URL=http:\/\/.*:$PROD_PORT/NEXTAUTH_URL=http:\/\/localhost:$STAGING_PORT/" "$STAGING_DIR/.env"
sed -i "s/\"$PROD_PORT:$PROD_PORT\"/\"$STAGING_PORT:$PROD_PORT\"/" "$STAGING_DIR/docker-compose.prod.yml"

# Iniciar ambiente de staging
echo "Iniciando ambiente de staging em localhost:$STAGING_PORT..."
cd "$STAGING_DIR"
docker-compose -f docker-compose.prod.yml up -d

# 3. Executar testes no ambiente de staging
echo "3. Executando testes no ambiente de staging..."

echo "Aguardando inicialização dos serviços (30s)..."
sleep 30

# Teste básico de conectividade
echo "Testando conectividade com o servidor..."
if curl -s "http://localhost:$STAGING_PORT/api/health" | grep -q "status.*ok"; then
    echo "✅ API de saúde respondendo corretamente."
else
    echo "❌ Falha na API de saúde! Verifique os logs:"
    docker-compose -f docker-compose.prod.yml logs app
    echo "⚠️ Deployment cancelado devido a falhas nos testes."
    exit 1
fi

# Executar testes mais completos
echo "Executando testes do sistema..."
cd "$STAGING_DIR"
if npm run test:health; then
    echo "✅ Testes de saúde executados com sucesso."
else
    echo "❌ Falha nos testes de saúde!"
    echo "⚠️ Deployment cancelado devido a falhas nos testes."
    exit 1
fi

# 4. Confirmar deployment em produção
echo "4. Testes concluídos com sucesso. Preparando para deployment em produção..."

read -p "Deseja continuar com o deployment em produção? (s/n): " CONFIRM
if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" ]]; then
    echo "Deployment cancelado pelo usuário."
    exit 0
fi

# 5. Desligar ambiente de staging
echo "5. Desligando ambiente de staging..."
cd "$STAGING_DIR"
docker-compose -f docker-compose.prod.yml down
echo "✅ Ambiente de staging desligado."

# 6. Preparar diretório de produção
echo "6. Preparando diretório de produção..."

# Criar diretório de produção se não existir
if [ ! -d "$APP_DIR" ]; then
    mkdir -p "$APP_DIR"
    echo "✅ Diretório de produção criado: $APP_DIR"
else
    echo "✅ Diretório de produção já existe: $APP_DIR"
fi

# Backup da configuração atual se existir
if [ -f "$APP_DIR/.env" ]; then
    mv "$APP_DIR/.env" "$APP_DIR/.env.backup_$(date +%Y%m%d_%H%M%S)"
    echo "✅ Backup da configuração anterior criado."
fi

# Copiar arquivos para produção
cp -r * "$APP_DIR/"
cp "$ENV_FILE" "$APP_DIR/.env"
echo "✅ Arquivos copiados para o diretório de produção."

# 7. Iniciar aplicação em produção
echo "7. Iniciando aplicação em produção..."
cd "$APP_DIR"
docker-compose -f docker-compose.prod.yml up -d
echo "✅ Aplicação iniciada em produção."

# 8. Verificar logs iniciais
echo "8. Verificando logs iniciais da aplicação..."
docker-compose -f docker-compose.prod.yml logs --tail=50 app

# 9. Verificar status dos containers
echo "9. Verificando status dos containers..."
docker-compose -f docker-compose.prod.yml ps

# 10. Finalizar deployment
echo "==============================="
echo "✅ Deployment concluído com sucesso!"
echo "✅ HealthCare está rodando em produção na porta $PROD_PORT"
echo ""
echo "📋 Monitoramento:"
echo "- Logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "- Status: docker-compose -f docker-compose.prod.yml ps"
echo "- Métricas: http://localhost:$PROD_PORT/api/metrics (se configurado)"
echo ""
echo "🔍 Verificação final:"
echo "- Acesse http://localhost:$PROD_PORT no navegador"
echo "- Faça login com as credenciais de administrador"
echo "- Verifique as funcionalidades principais"
echo "==============================="
