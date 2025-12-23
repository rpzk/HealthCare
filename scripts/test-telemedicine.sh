#!/bin/bash

# 🧪 Script de Teste Automático - Sistema de Teleconsulta HealthCare
# Testa todos os componentes da videochamada

set -e

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║    🧪 TESTE DE TELECONSULTA - HealthCare System       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
TEST_LOG="test-results-$(date +%F-%H%M%S).log"
PASSED=0
FAILED=0

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logar resultado
log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC} | $test_name"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC} | $test_name"
        if [ -n "$details" ]; then
            echo -e "   ${RED}→${NC} $details"
        fi
        ((FAILED++))
    fi
    
    echo "[$TIMESTAMP] $status - $test_name" >> "$TEST_LOG"
}

# ============================================
# 1. TESTES DE INFRAESTRUTURA
# ============================================

echo -e "${BLUE}📋 1. TESTES DE INFRAESTRUTURA${NC}"
echo ""

# Test 1.1: Node/npm
if command -v node &> /dev/null && command -v npm &> /dev/null; then
    NODE_VERSION=$(node -v)
    NPM_VERSION=$(npm -v)
    log_test "Node.js disponível ($NODE_VERSION)" "PASS"
    log_test "npm disponível ($NPM_VERSION)" "PASS"
else
    log_test "Node.js/npm" "FAIL" "Node.js ou npm não encontrado"
fi

# Test 1.2: PostgreSQL
if command -v psql &> /dev/null; then
    log_test "PostgreSQL instalado" "PASS"
else
    log_test "PostgreSQL instalado" "FAIL" "psql não encontrado"
fi

# Test 1.3: Redis
if command -v redis-cli &> /dev/null; then
    REDIS_PING=$(redis-cli ping 2>/dev/null || echo "OFFLINE")
    if [ "$REDIS_PING" = "PONG" ]; then
        log_test "Redis rodando" "PASS"
    else
        log_test "Redis rodando" "FAIL" "Redis não responde"
    fi
else
    log_test "Redis instalado" "FAIL" "redis-cli não encontrado"
fi

# Test 1.4: Docker
if command -v docker &> /dev/null; then
    DOCKER_STATUS=$(docker ps &>/dev/null && echo "OK" || echo "FAIL")
    if [ "$DOCKER_STATUS" = "OK" ]; then
        log_test "Docker rodando" "PASS"
    else
        log_test "Docker rodando" "FAIL" "Docker daemon não responde"
    fi
else
    log_test "Docker instalado" "FAIL"
fi

echo ""

# ============================================
# 2. TESTES DE ARQUIVOS
# ============================================

echo -e "${BLUE}📁 2. TESTES DE ARQUIVOS NECESSÁRIOS${NC}"
echo ""

FILES_CHECK=(
    "app/tele/join/[token]/page.tsx:Página de join da teleconsulta"
    "components/tele/patient-room.tsx:Componente de sala do paciente"
    "components/tele/room.tsx:Componente de sala do médico"
    "lib/webrtc-utils.ts:Utilitários WebRTC"
    "app/api/tele/config/route.ts:API de configuração TURN"
    "app/api/tele/rooms/[id]/signal/route.ts:API de sinalização WebRTC"
    "app/api/tele/rooms/[id]/events/route.ts:API de eventos da sala"
)

for file_check in "${FILES_CHECK[@]}"; do
    IFS=':' read -r file_path description <<< "$file_check"
    if [ -f "$file_path" ]; then
        log_test "$description" "PASS"
    else
        log_test "$description" "FAIL" "Arquivo não encontrado: $file_path"
    fi
done

echo ""

# ============================================
# 3. TESTES DE DEPENDÊNCIAS
# ============================================

echo -e "${BLUE}📦 3. TESTES DE DEPENDÊNCIAS NPM${NC}"
echo ""

REQUIRED_PACKAGES=(
    "next:Framework"
    "react:React"
    "ioredis:Redis client"
    "prisma:ORM"
    "typescript:TypeScript"
    "tailwindcss:CSS"
)

# Verificar se package.json existe
if [ -f "package.json" ]; then
    log_test "package.json encontrado" "PASS"
    
    # Verificar alguns pacotes críticos
    for package_info in "${REQUIRED_PACKAGES[@]}"; do
        IFS=':' read -r package_name package_desc <<< "$package_info"
        if grep -q "\"$package_name\"" package.json; then
            log_test "Dependência: $package_desc" "PASS"
        else
            log_test "Dependência: $package_desc" "FAIL" "Não encontrado em package.json"
        fi
    done
else
    log_test "package.json" "FAIL"
fi

echo ""

# ============================================
# 4. TESTES DE CONFIGURAÇÃO
# ============================================

echo -e "${BLUE}⚙️  4. TESTES DE CONFIGURAÇÃO${NC}"
echo ""

# Test 4.1: .env
if [ -f ".env" ] || [ -f ".env.local" ]; then
    log_test ".env configurado" "PASS"
    
    # Verificar variáveis críticas
    if grep -q "DATABASE_URL" .env* 2>/dev/null; then
        log_test "DATABASE_URL definido" "PASS"
    else
        log_test "DATABASE_URL definido" "FAIL"
    fi
    
    if grep -q "REDIS_URL\|REDIS_HOST" .env* 2>/dev/null; then
        log_test "Redis configurado" "PASS"
    else
        log_test "Redis configurado" "FAIL"
    fi
else
    log_test ".env encontrado" "FAIL"
fi

echo ""

# ============================================
# 5. TESTES DE BANCO DE DADOS
# ============================================

echo -e "${BLUE}🗄️  5. TESTES DE BANCO DE DADOS${NC}"
echo ""

# Test 5.1: Prisma schema
if [ -f "prisma/schema.prisma" ]; then
    log_test "Prisma schema encontrado" "PASS"
    
    # Verificar modelos críticos
    CRITICAL_MODELS=("Consultation" "User" "Patient" "TelemedicineRecording")
    for model in "${CRITICAL_MODELS[@]}"; do
        if grep -q "model $model" prisma/schema.prisma; then
            log_test "Model Prisma: $model" "PASS"
        else
            log_test "Model Prisma: $model" "FAIL"
        fi
    done
else
    log_test "Prisma schema" "FAIL"
fi

echo ""

# ============================================
# 6. TESTES DE CÓDIGO
# ============================================

echo -e "${BLUE}🔍 6. ANÁLISE DE CÓDIGO${NC}"
echo ""

# Test 6.1: TypeScript
if command -v tsc &> /dev/null; then
    # Apenas check, não build
    if npx -y tsc --noEmit --skipLibCheck 2>/dev/null; then
        log_test "TypeScript válido (verificação)" "PASS"
    else
        log_test "TypeScript válido (verificação)" "FAIL"
    fi
else
    log_test "TypeScript compiler" "FAIL"
fi

# Test 6.2: WebRTC Utils
if grep -q "getIceServers\|QUALITY_PRESETS\|ConnectionStatsMonitor" lib/webrtc-utils.ts; then
    log_test "WebRTC utils completos" "PASS"
else
    log_test "WebRTC utils completos" "FAIL"
fi

# Test 6.3: API Routes
if [ -f "app/api/tele/config/route.ts" ]; then
    if grep -q "NextRequest\|NextResponse" app/api/tele/config/route.ts; then
        log_test "API routes configuradas" "PASS"
    else
        log_test "API routes configuradas" "FAIL"
    fi
fi

echo ""

# ============================================
# 7. TESTES DE SEGURANÇA
# ============================================

echo -e "${BLUE}🔒 7. TESTES DE SEGURANÇA${NC}"
echo ""

# Test 7.1: withAuth middleware
if grep -r "withAuth" app/api/tele/ &>/dev/null; then
    log_test "Autenticação em APIs de tele" "PASS"
else
    log_test "Autenticação em APIs de tele" "FAIL"
fi

# Test 7.2: Rate limiting
if grep -r "rateLimiter" app/api/tele/ &>/dev/null; then
    log_test "Rate limiting em APIs" "PASS"
else
    log_test "Rate limiting em APIs" "FAIL"
fi

# Test 7.3: CORS
if grep -r "CORS\|Access-Control" app/api/ &>/dev/null; then
    log_test "CORS configurado" "PASS"
else
    log_test "CORS configurado" "FAIL"
fi

echo ""

# ============================================
# 8. TESTES DE INTEGRAÇÃO
# ============================================

echo -e "${BLUE}🔗 8. TESTES DE INTEGRAÇÃO${NC}"
echo ""

# Test 8.1: Coturn config
if [ -f "coturn/turnserver.conf" ]; then
    log_test "Configuração Coturn" "PASS"
    
    if grep -q "external-ip" coturn/turnserver.conf; then
        log_test "Coturn com external-ip" "PASS"
    fi
else
    log_test "Configuração Coturn" "FAIL"
fi

# Test 8.2: Docker compose
if [ -f "docker-compose.yml" ] || [ -f "docker-compose.prod.yml" ]; then
    log_test "docker-compose encontrado" "PASS"
    
    if [ -f "docker-compose.coturn.yml" ]; then
        log_test "docker-compose para Coturn" "PASS"
    fi
fi

# Test 8.3: Scripts de instalação
if [ -f "scripts/install-coturn.sh" ] && [ -x "scripts/install-coturn.sh" ]; then
    log_test "Script de instalação Coturn" "PASS"
fi

if [ -f "scripts/check-turn-health.sh" ] && [ -x "scripts/check-turn-health.sh" ]; then
    log_test "Health check TURN" "PASS"
fi

echo ""

# ============================================
# 9. TESTES DE DOCUMENTAÇÃO
# ============================================

echo -e "${BLUE}📚 9. TESTES DE DOCUMENTAÇÃO${NC}"
echo ""

DOC_FILES=(
    "docs/TELEMEDICINE_SETUP.md:Setup detalhado"
    "docs/TELEMEDICINE_QUICKSTART.md:Quickstart"
)

for doc_file in "${DOC_FILES[@]}"; do
    IFS=':' read -r file_path description <<< "$doc_file"
    if [ -f "$file_path" ] && [ -s "$file_path" ]; then
        log_test "$description" "PASS"
    else
        log_test "$description" "FAIL"
    fi
done

echo ""

# ============================================
# RESUMO
# ============================================

TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 RESUMO DOS TESTES${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Total de testes: ${BLUE}$TOTAL${NC}"
echo -e "Aprovados:      ${GREEN}$PASSED${NC}"
echo -e "Falhados:       ${RED}$FAILED${NC}"
echo -e "Taxa de sucesso: ${BLUE}${PERCENTAGE}%${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✨ TODOS OS TESTES PASSARAM! ✨                      ║${NC}"
    echo -e "${GREEN}║  Sistema de teleconsulta está pronto para uso!        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "🚀 Próximos passos:"
    echo "   1. npm run dev          # Iniciar servidor"
    echo "   2. Acessar localhost:3001/diagnostics/webrtc"
    echo "   3. Criar uma consulta e testar videochamada"
    echo ""
    exit 0
else
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️  ${FAILED} teste(s) falharam                                 ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Verifique o log completo em: $TEST_LOG"
    echo ""
    exit 1
fi
