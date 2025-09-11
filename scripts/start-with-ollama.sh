#!/bin/bash

# Script para iniciar o ambiente HealthCare com Ollama
# Este script inicializa o banco de dados, o Redis, o Ollama e baixa o modelo necessário

echo "🏥 Iniciando ambiente HealthCare com IA local via Ollama..."
echo "============================================================"

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
  echo "ℹ️ Arquivo .env não encontrado. Copiando de .env.example..."
  cp .env.example .env
  echo "✅ Arquivo .env criado. Por favor, verifique as configurações!"
fi

# Iniciar os serviços com Docker Compose
echo "🚀 Iniciando serviços (PostgreSQL, Redis, Ollama)..."
docker-compose up -d postgres redis ollama
echo "✅ Serviços iniciados!"

# Esperar o Ollama iniciar
echo "⏳ Aguardando o serviço Ollama iniciar..."
sleep 10

# Definir modelo padrão se não estiver no .env
OLLAMA_MODEL=$(grep OLLAMA_MODEL .env | cut -d '=' -f2)
if [ -z "$OLLAMA_MODEL" ]; then
  OLLAMA_MODEL="llama3"
  echo "ℹ️ Modelo não definido no .env, usando o padrão: $OLLAMA_MODEL"
fi

# Baixar o modelo do Ollama
echo "📥 Baixando modelo $OLLAMA_MODEL para o Ollama..."
docker-compose exec ollama ollama pull $OLLAMA_MODEL
echo "✅ Modelo baixado com sucesso!"

# Aplicar migrations ao banco de dados
echo "🔄 Aplicando migrations ao banco de dados..."
npm run db:push
echo "✅ Migrations aplicadas!"

# Popular o banco com dados iniciais se necessário
if [ "$1" == "--seed" ]; then
  echo "🌱 Populando banco de dados com dados iniciais..."
  npm run db:seed
  echo "✅ Dados iniciais inseridos!"
fi

# Iniciar a aplicação
echo "🚀 Iniciando aplicação HealthCare..."
docker-compose up -d app
echo "✅ Aplicação iniciada!"

# Exibir informações finais
echo "============================================================"
echo "🎉 Ambiente HealthCare está pronto!"
echo "📊 Dashboard: http://localhost:3000"
echo "🔐 Login: admin@healthcare.com / admin123"
echo "============================================================"
echo "ℹ️ Para ver os logs: docker-compose logs -f app"
echo "ℹ️ Para parar: docker-compose down"
echo "============================================================"
