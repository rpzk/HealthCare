#!/bin/bash
# Test script for certificate session API
# Execute from host machine

echo "============================================"
echo "  TESTE API SESSÃO DE CERTIFICADO"
echo "============================================"

BASE_URL="http://localhost:3000"

# Test 1: Unauthenticated request should fail
echo ""
echo "1. Teste sem autenticação (deve retornar erro)"
RESPONSE=$(curl -s "$BASE_URL/api/certificate-session")
echo "   Response: $RESPONSE"

if [[ $RESPONSE == *"Não autenticado"* ]]; then
  echo "   ✅ PASSOU: Requer autenticação"
else
  echo "   ❌ FALHOU: Deveria rejeitar sem autenticação"
fi

# Test 2: Check documents API exists
echo ""
echo "2. Verificando API de documentos"
RESPONSE=$(curl -s "$BASE_URL/api/documents")
echo "   Response: $RESPONSE"

if [[ $RESPONSE == *"Não autenticado"* ]] || [[ $RESPONSE == *"Method not allowed"* ]]; then
  echo "   ✅ PASSOU: API documentos existe"
else
  echo "   ⚠️  Resposta inesperada"
fi

# Test 3: Health check
echo ""
echo "3. Health check geral"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/session")
echo "   HTTP Status: $HTTP_CODE"

if [[ $HTTP_CODE == "200" ]]; then
  echo "   ✅ PASSOU: Servidor respondendo"
else
  echo "   ⚠️  Status: $HTTP_CODE"
fi

echo ""
echo "============================================"
echo "  INSTRUÇÕES PARA TESTE COMPLETO:"
echo "============================================"
echo ""
echo "1. Faça login como Rafael (rafael.piazenski@gmail.com)"
echo ""
echo "2. Acesse a página de prescrições ou use o Developer Tools:"
echo "   - Abra o Console do navegador (F12)"
echo "   - Execute os comandos abaixo:"
echo ""
echo "   // Verificar status da sessão"
echo "   fetch('/api/certificate-session').then(r=>r.json()).then(console.log)"
echo ""
echo "   // Iniciar sessão com senha do certificado"
echo "   fetch('/api/certificate-session', {"
echo "     method: 'POST',"
echo "     headers: {'Content-Type': 'application/json'},"
echo "     body: JSON.stringify({password: 'SUA_SENHA_DO_CERTIFICADO'})"
echo "   }).then(r=>r.json()).then(console.log)"
echo ""
echo "   // Bloquear sessão"
echo "   fetch('/api/certificate-session', {"
echo "     method: 'PATCH',"
echo "     headers: {'Content-Type': 'application/json'},"
echo "     body: JSON.stringify({action: 'lock'})"
echo "   }).then(r=>r.json()).then(console.log)"
echo ""
echo "   // Desbloquear sessão"
echo "   fetch('/api/certificate-session', {"
echo "     method: 'PATCH',"
echo "     headers: {'Content-Type': 'application/json'},"
echo "     body: JSON.stringify({action: 'unlock', password: 'SUA_SENHA'})"
echo "   }).then(r=>r.json()).then(console.log)"
echo ""
echo "   // Encerrar sessão"
echo "   fetch('/api/certificate-session', {method: 'DELETE'}).then(r=>r.json()).then(console.log)"
echo ""
echo "============================================"
