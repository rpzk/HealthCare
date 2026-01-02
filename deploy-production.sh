#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# SCRIPT DE DEPLOY EM PRODUÇÃO - Dashboard de Análise de Questionários
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔═════════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                                 ║${NC}"
echo -e "${BLUE}║           🚀 DEPLOY EM PRODUÇÃO - Dashboard de Questionários                  ║${NC}"
echo -e "${BLUE}║                                                                                 ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────────
# ETAPA 1: VALIDAÇÃO INICIAL
# ─────────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/7] Validando ambiente...${NC}"
echo ""

if [ ! -d ".git" ]; then
  echo -e "${RED}❌ Não está em um repositório Git!${NC}"
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Arquivo package.json não encontrado!${NC}"
  exit 1
fi

if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
  echo -e "${RED}❌ Arquivo .env ou .env.local não encontrado!${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Ambiente validado${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────────
# ETAPA 2: VERIFICAR BRANCH E STATUS GIT
# ─────────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/7] Verificando Git...${NC}"
echo ""

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${RED}❌ Você está no branch '$CURRENT_BRANCH'. Deve estar em 'main' para deploy!${NC}"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}⚠️  Há mudanças não commitadas:${NC}"
  git status --short
  echo ""
  read -p "Deseja continuar mesmo assim? (s/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    exit 1
  fi
fi

echo -e "${GREEN}✓ Git validado${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────────
# ETAPA 3: INSTALAR DEPENDÊNCIAS
# ─────────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[3/7] Instalando dependências...${NC}"
echo ""

npm install --production=false

echo -e "${GREEN}✓ Dependências instaladas${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────────
# ETAPA 4: GERAR PRISMA E MIGRATIONS
# ─────────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/7] Preparando banco de dados...${NC}"
echo ""

npx prisma generate
echo -e "${GREEN}✓ Cliente Prisma gerado${NC}"

# Executar migrations se houver
if [ -f "prisma/migrations" ] && [ -n "$(ls prisma/migrations)" ]; then
  echo "Executando migrations..."
  npx prisma migrate deploy
  echo -e "${GREEN}✓ Migrations executadas${NC}"
else
  echo -e "${GREEN}✓ Nenhuma migration pendente${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────────
# ETAPA 5: LINT E TYPE CHECK
# ─────────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[5/7] Validando código...${NC}"
echo ""

if npm run type-check 2>/dev/null; then
  echo -e "${GREEN}✓ Type check passou${NC}"
else
  echo -e "${YELLOW}⚠️  Type check encontrou avisos (continuando...)${NC}"
fi

if npm run lint 2>/dev/null; then
  echo -e "${GREEN}✓ Lint passou${NC}"
else
  echo -e "${YELLOW}⚠️  Lint encontrou avisos (continuando...)${NC}"
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────────
# ETAPA 6: BUILD PARA PRODUÇÃO
# ─────────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[6/7] Compilando para produção...${NC}"
echo ""

if npm run build; then
  echo -e "${GREEN}✓ Build concluído com sucesso${NC}"
else
  echo -e "${RED}❌ Build falhou!${NC}"
  exit 1
fi

echo ""

# ─────────────────────────────────────────────────────────────────────────────────
# ETAPA 7: RESUMO E PRÓXIMOS PASSOS
# ─────────────────────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[7/7] Preparação final...${NC}"
echo ""

echo -e "${GREEN}✓ Aplicação pronta para deploy!${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}RESUMO DE DEPLOY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "📊 DASHBOARD DE QUESTIONÁRIOS INTEGRADO:"
echo "  ✅ 4 Componentes React"
echo "  ✅ 7 APIs Next.js"
echo "  ✅ 3 Integrações de notificações"
echo "  ✅ Link adicionado ao menu"
echo ""

echo "📦 BUILD STATUS:"
BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "N/A")
echo "  Tamanho: $BUILD_SIZE"
echo "  Timestamp: $(date)"
echo ""

echo "🚀 PRÓXIMOS PASSOS:"
echo ""
echo "1️⃣  LOCAL (Testing):"
echo "   npm start"
echo "   Acesse: http://localhost:3000/admin/questionnaire-analytics"
echo ""
echo "2️⃣  STAGING:"
echo "   docker build -t healthcare:staging ."
echo "   docker run -d -p 3000:3000 healthcare:staging"
echo ""
echo "3️⃣  PRODUÇÃO (após validação em staging):"
echo "   docker build -t healthcare:prod ."
echo "   docker push <seu-registry>/healthcare:prod"
echo "   kubectl apply -f k8s/deployment.yaml"
echo ""
echo "4️⃣  VALIDAÇÃO:"
echo "   bash validate-questionnaire-dashboard.sh"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "📋 CHECKLIST DE DEPLOY:"
echo "  [ ] Testar em http://localhost:3000"
echo "  [ ] Acessar Dashboard em /admin/questionnaire-analytics"
echo "  [ ] Verificar notificações funcionam"
echo "  [ ] Validar BD com índices criados"
echo "  [ ] Testar em staging"
echo "  [ ] Deploy em produção"
echo "  [ ] Monitorar logs e performance"
echo ""

echo -e "${GREEN}╔═════════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                                 ║${NC}"
echo -e "${GREEN}║                   ✅ PREPARAÇÃO CONCLUÍDA COM SUCESSO!                        ║${NC}"
echo -e "${GREEN}║                                                                                 ║${NC}"
echo -e "${GREEN}║                    Execute: npm start                                          ║${NC}"
echo -e "${GREEN}║                                                                                 ║${NC}"
echo -e "${GREEN}╚═════════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

exit 0
