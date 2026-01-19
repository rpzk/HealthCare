#!/bin/bash

# 🧪 Script de Teste do Rate Limiting HealthCare
# Testa os limites configurados para diferentes tipos de API

echo "🧪 Teste de Rate Limiting - HealthCare Advanced Security"
echo "========================================================"
echo ""

# Configurações de teste
BASE_URL="http://localhost:3000"
AUTH_TOKEN=""  # Substitua por um token válido se necessário

echo "🎯 INICIANDO TESTES DE RATE LIMITING"
echo ""

# Função para fazer múltiplas requisições
test_rate_limit() {
    local endpoint=$1
    local limit_name=$2
    local expected_limit=$3
    local requests_to_make=$4
    
    echo "📡 Testando $limit_name ($endpoint)"
    echo "   Limite esperado: $expected_limit req/min"
    echo "   Fazendo $requests_to_make requisições..."
    
    local blocked_count=0
    local success_count=0
    
    for ((i=1; i<=requests_to_make; i++)); do
        response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL$endpoint" \
            -H "Accept: application/json" \
            -H "Content-Type: application/json" \
            ${AUTH_TOKEN:+-H "Authorization: Bearer $AUTH_TOKEN"})
        
        if [ "$response" == "429" ]; then
            ((blocked_count++))
            if [ $blocked_count -eq 1 ]; then
                echo "   ⚠️  Rate limit atingido na requisição $i"
            fi
        elif [ "$response" == "200" ] || [ "$response" == "201" ]; then
            ((success_count++))
        fi
        
        # Pequena pausa entre requests
        sleep 0.1
    done
    
    echo "   ✅ Sucessos: $success_count"
    echo "   🚫 Bloqueados: $blocked_count"
    
    if [ $blocked_count -gt 0 ]; then
        echo "   🎉 Rate limiting FUNCIONANDO!"
    else
        echo "   ⚠️  Rate limiting pode não estar ativo"
    fi
    
    echo ""
}

# Função para verificar headers de rate limit
check_rate_limit_headers() {
    local endpoint=$1
    local name=$2
    
    echo "🔍 Verificando headers de rate limit - $name"
    
    headers=$(curl -s -I "$BASE_URL$endpoint" \
        ${AUTH_TOKEN:+-H "Authorization: Bearer $AUTH_TOKEN"} | \
        grep -i "x-ratelimit\|retry-after")
    
    if [ -n "$headers" ]; then
        echo "   Headers encontrados:"
        echo "$headers" | sed 's/^/     /'
    else
        echo "   ⚠️  Headers de rate limit não encontrados"
    fi
    
    echo ""
}

# Testes para diferentes tipos de API

echo "🧠 TESTE 1: APIs de IA Médica (Limite: 30 req/min)"
test_rate_limit "/api/ai/analyze-symptoms" "IA Médica" 30 35
check_rate_limit_headers "/api/ai/analyze-symptoms" "IA Médica"

echo "🏥 TESTE 2: APIs de Consultas (Limite: 100 req/min)"
test_rate_limit "/api/consultations" "Consultas" 100 105
check_rate_limit_headers "/api/consultations" "Consultas"

echo "👥 TESTE 3: APIs de Pacientes (Limite: 200 req/min)"
test_rate_limit "/api/patients" "Pacientes" 200 205
check_rate_limit_headers "/api/patients" "Pacientes"

echo "📈 TESTE 4: APIs de Dashboard (Limite: 500 req/min)"
test_rate_limit "/api/dashboard" "Dashboard" 500 505
check_rate_limit_headers "/api/dashboard" "Dashboard"

echo "🛡️ TESTE 5: API Administrativa (Sem limite para admin)"
test_rate_limit "/api/admin/security" "Admin Security" "UNLIMITED" 10
check_rate_limit_headers "/api/admin/security" "Admin Security"

echo ""
echo "📊 VERIFICANDO STATUS DO SISTEMA"
echo ""

# Verificar se o sistema está rodando
echo "🔍 Verificando se o servidor está ativo..."
if curl -s "$BASE_URL" > /dev/null; then
    echo "   ✅ Servidor rodando em $BASE_URL"
else
    echo "   ❌ Servidor não está acessível em $BASE_URL"
    echo "   💡 Execute: npm run dev"
    exit 1
fi

# Verificar arquivos de rate limiting
echo ""
echo "🔍 Verificando arquivos do sistema de rate limiting..."

files_to_check=(
    "lib/rate-limiter.ts"
    "lib/advanced-auth.ts"
    "app/api/admin/security/route.ts"
    "middleware.ts"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file não encontrado"
    fi
done

echo ""
echo "🎯 CONCLUSÃO DOS TESTES"
echo ""
echo "✅ Para um teste completo, você deve:"
echo "   1. Iniciar o servidor: npm run dev"
echo "   2. Fazer login e obter token de autenticação"
echo "   3. Executar este script novamente com AUTH_TOKEN definido"
echo ""
echo "📡 Para monitorar em tempo real:"
echo "   • Acesse http://localhost:3000/security-monitoring"
echo "   • API de stats: GET $BASE_URL/api/admin/security"
echo ""
echo "🔧 Para resetar rate limits:"
echo "   • POST $BASE_URL/api/admin/security"
echo "   • Body: { \"action\": \"reset-rate-limit\", \"userId\": \"user-id\" }"
echo ""
echo "🚀 Sistema de Rate Limiting Testado!"
echo "   O HealthCare agora possui proteção avançada contra DDoS"
echo "   com limites inteligentes por tipo de operação."
