#!/bin/bash

# Test script para verificar a integração com o Ollama
# Este script testa a comunicação com o servidor Ollama e realiza uma inferência básica

echo "🔍 Teste de Integração com Ollama"
echo "=================================="

# Verificar se o Ollama está em execução
echo "1. Verificando se o serviço Ollama está rodando..."

if ! docker ps | grep -q healthcare-ollama; then
  echo "❌ Serviço Ollama não encontrado! Iniciando o serviço..."
  docker-compose up -d ollama
  echo "⏳ Aguardando inicialização do Ollama (10s)..."
  sleep 10
else
  echo "✅ Serviço Ollama está rodando."
fi

# Verificar se o modelo está disponível
echo "2. Verificando modelos disponíveis no Ollama..."
MODELOS=$(docker-compose exec ollama ollama list)
echo "$MODELOS"

# Extrair o modelo do arquivo .env ou usar o padrão
if [ -f .env ]; then
  OLLAMA_MODEL=$(grep OLLAMA_MODEL .env | cut -d '=' -f2)
fi

if [ -z "$OLLAMA_MODEL" ]; then
  OLLAMA_MODEL="llama3"
  echo "ℹ️ Modelo não definido no .env, usando o padrão: $OLLAMA_MODEL"
fi

# Verificar se o modelo desejado já está disponível
if echo "$MODELOS" | grep -q "$OLLAMA_MODEL"; then
  echo "✅ Modelo $OLLAMA_MODEL já está disponível."
else
  echo "⚠️ Modelo $OLLAMA_MODEL não encontrado. Baixando..."
  docker-compose exec ollama ollama pull $OLLAMA_MODEL
  if [ $? -eq 0 ]; then
    echo "✅ Modelo $OLLAMA_MODEL baixado com sucesso."
  else
    echo "❌ Falha ao baixar o modelo $OLLAMA_MODEL."
    exit 1
  fi
fi

# Testar o modelo com uma consulta médica básica
echo "3. Testando inferência do modelo com consulta médica..."
echo "Enviando prompt: 'Quais são os sintomas comuns de diabetes?'"

RESPONSE=$(docker-compose exec ollama ollama run $OLLAMA_MODEL "Atue como um assistente médico e responda de forma sucinta: Quais são os sintomas comuns de diabetes?")

# Exibir resposta
echo "Resposta do modelo $OLLAMA_MODEL:"
echo "-----------------------------------"
echo "$RESPONSE"
echo "-----------------------------------"

# Testar a integração da API
echo "4. Testando API do Ollama..."

TEST_API=$(docker-compose exec ollama curl -s -X POST http://localhost:11434/api/generate -d '{
  "model": "'$OLLAMA_MODEL'",
  "prompt": "Liste 3 recomendações para prevenção de hipertensão.",
  "stream": false
}')

if echo "$TEST_API" | grep -q "response"; then
  echo "✅ API do Ollama está funcionando corretamente."
  
  # Mostrar apenas a resposta formatada
  RESPONSE=$(echo "$TEST_API" | grep -o '"response":"[^"]*"' | sed 's/"response":"//;s/"//')
  echo "Resposta da API:"
  echo "-----------------------------------"
  echo "$RESPONSE"
  echo "-----------------------------------"
else
  echo "❌ Falha ao comunicar com a API do Ollama."
  echo "$TEST_API"
  exit 1
fi

echo "5. Verificando integração com a aplicação..."
# Verificar se a aplicação está rodando
if ! docker ps | grep -q healthcare-app; then
  echo "⚠️ Aplicação não está rodando. Iniciando apenas para teste..."
  docker-compose up -d app
  sleep 5
fi

# Verificar logs para confirmar que está usando o Ollama
echo "Verificando logs da aplicação para confirmar integração com Ollama..."
docker-compose logs --tail=50 app | grep -i "ollama"

echo "=================================="
echo "✅ Teste de integração completo!"
echo "✅ Ollama está configurado e funcionando corretamente."
echo "✅ O modelo $OLLAMA_MODEL está pronto para uso."
echo "=================================="
echo "Para usar a aplicação completa: npm run start:ollama"
echo "=================================="
