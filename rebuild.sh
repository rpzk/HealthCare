#!/bin/bash

# Script para rebuild após mudanças no código
# Uso: ./rebuild.sh [dev|prod]

set -e

ENV=${1:-dev}
echo "🔄 Rebuilding HealthCare App (${ENV})..."

if [ "$ENV" = "prod" ]; then
    echo "📦 Production rebuild..."
    
    # Parar containers
    echo "⏹️  Parando containers..."
    docker compose -f docker-compose.prod.yml down
    
    # Rebuild sem cache
    echo "🏗️  Rebuild da imagem (sem cache)..."
    docker compose -f docker-compose.prod.yml build --no-cache app
    
    # Subir novamente
    echo "🚀 Iniciando containers..."
    docker compose -f docker-compose.prod.yml up -d
    
    # Aguardar healthcheck
    echo "⏳ Aguardando aplicação ficar pronta..."
    sleep 5
    
    # Mostrar logs
    echo "📋 Logs recentes:"
    docker compose -f docker-compose.prod.yml logs --tail=50 app
    
    echo "✅ Rebuild completo! App rodando em produção."
    
elif [ "$ENV" = "dev" ]; then
    echo "🔧 Development rebuild..."
    
    # Parar containers
    echo "⏹️  Parando containers..."
    docker compose down
    
    # Rebuild
    echo "🏗️  Rebuild da imagem..."
    docker compose build app
    
    # Subir novamente
    echo "🚀 Iniciando containers..."
    docker compose up -d
    
    # Mostrar logs
    echo "📋 Logs (Ctrl+C para sair):"
    docker compose logs -f app
    
elif [ "$ENV" = "local" ]; then
    echo "💻 Local development rebuild..."
    
    # Regenerar Prisma
    echo "🗄️  Regenerando Prisma client..."
    npx prisma generate
    
    # Build local
    echo "🏗️  Building Next.js..."
    npm run build
    
    echo "✅ Build completo! Execute 'npm run dev' para iniciar."
    
else
    echo "❌ Uso: ./rebuild.sh [dev|prod|local]"
    exit 1
fi

echo ""
echo "🎉 Rebuild finalizado com sucesso!"
