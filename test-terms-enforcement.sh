#!/bin/bash

# Script para testar o sistema de termos de consentimento obrigatórios
# Uso: ./test-terms-enforcement.sh

set -e

echo "=== Teste do Sistema de Termos de Consentimento ==="
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo -e "${BLUE}1. Verificando se a aplicação está rodando...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -q "200\|301\|302"; then
  echo -e "${GREEN}✓ Aplicação está respondendo${NC}"
else
  echo -e "${YELLOW}⚠ Aplicação não está respondendo em $BASE_URL${NC}"
  echo "Execute: npm run dev"
  exit 1
fi

echo ""
echo -e "${BLUE}2. Testando API de termos pendentes (requer autenticação)${NC}"
echo "Endpoint: GET $BASE_URL/api/terms/pending"
echo ""

echo -e "${YELLOW}Para testar manualmente:${NC}"
echo "1. Acesse $BASE_URL/admin/terms e crie um novo termo"
echo "2. Configure o termo como ativo"
echo "3. Faça logout e login novamente"
echo "4. Você deve ser redirecionado para /terms/accept"
echo ""

echo -e "${BLUE}3. Estrutura de arquivos criados:${NC}"
echo ""

echo "📁 Arquivos do sistema de termos:"
files=(
  "lib/check-pending-terms.ts"
  "hooks/use-terms-enforcement.ts"
  "components/terms-guard.tsx"
  "app/terms/accept/page.tsx"
  "app/api/terms/pending/route.ts"
  "app/api/terms/accept/route.ts"
  "TERMS_ENFORCEMENT_GUIDE.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file"
  else
    echo -e "  ${YELLOW}⚠${NC} $file (não encontrado)"
  fi
done

echo ""
echo -e "${BLUE}4. Layouts com TermsGuard:${NC}"
layouts=(
  "app/admin/layout.tsx"
  "app/minha-saude/layout.tsx"
)

for layout in "${layouts[@]}"; do
  if grep -q "TermsGuard" "$layout" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $layout (contém TermsGuard)"
  else
    echo -e "  ${YELLOW}⚠${NC} $layout (TermsGuard não encontrado)"
  fi
done

echo ""
echo -e "${BLUE}5. Página principal verifica termos:${NC}"
if grep -q "checkPendingTerms" "app/page.tsx" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} app/page.tsx verifica termos pendentes"
else
  echo -e "  ${YELLOW}⚠${NC} app/page.tsx não verifica termos"
fi

echo ""
echo -e "${GREEN}=== Teste Concluído ===${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Execute: npm run dev"
echo "2. Acesse: $BASE_URL/admin/terms"
echo "3. Crie um termo de teste (ex: 'privacy-policy-test')"
echo "4. Ative o termo"
echo "5. Faça logout e login novamente"
echo "6. Verifique se é redirecionado para /terms/accept"
echo ""
echo "📖 Documentação completa: TERMS_ENFORCEMENT_GUIDE.md"
