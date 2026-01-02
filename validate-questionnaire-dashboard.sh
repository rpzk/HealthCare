#!/bin/bash
# Questionnaire Analytics Dashboard - Validation Checklist
# Este script valida que todos os arquivos foram criados corretamente

set -e

echo "🔍 Validando Dashboard de Análise de Questionários..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
TOTAL=0
PASSED=0
FAILED=0

# Função para validar arquivo
check_file() {
  local file=$1
  local description=$2
  
  TOTAL=$((TOTAL + 1))
  
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
    echo "  $description"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗${NC} $file"
    echo "  $description"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# Função para validar diretório
check_dir() {
  local dir=$1
  local description=$2
  
  TOTAL=$((TOTAL + 1))
  
  if [ -d "$dir" ]; then
    echo -e "${GREEN}✓${NC} $dir/"
    echo "  $description"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗${NC} $dir/"
    echo "  $description"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# Função para validar conteúdo de arquivo
check_content() {
  local file=$1
  local search=$2
  local description=$3
  
  TOTAL=$((TOTAL + 1))
  
  if grep -q "$search" "$file" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $file contém '$search'"
    echo "  $description"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗${NC} $file não contém '$search'"
    echo "  $description"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 COMPONENTES REACT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

check_file "components/questionnaires/questionnaire-analytics-dashboard.tsx" \
           "Dashboard principal com gráficos e KPIs"

check_file "components/questionnaires/questionnaire-notifications-panel.tsx" \
           "Painel de notificações com filtros"

check_file "components/questionnaires/questionnaire-insights.tsx" \
           "Visualizador de insights da IA"

check_file "components/questionnaires/questionnaire-alert-widget.tsx" \
           "Widget rápido de alertas"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔌 APIs NEXT.JS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

check_file "app/api/questionnaires/analytics/route.ts" \
           "API de analytics e métricas"

check_file "app/api/questionnaires/notifications/route.ts" \
           "API para listar notificações"

check_file "app/api/questionnaires/notifications/\[id\]/route.ts" \
           "API para atualizar/deletar notificação individual"

check_file "app/api/questionnaires/notifications/mark-all-read/route.ts" \
           "API para marcar todas as notificações como lidas"

check_file "app/api/questionnaires/insights/route.ts" \
           "API para extrair insights da IA"

check_file "app/api/questionnaires/alerts/summary/route.ts" \
           "API para resumo de alertas"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🛠️ SERVIÇOS & UTILIDADES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

check_file "lib/questionnaire-notification-service.ts" \
           "Serviço para criar notificações automáticas"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📄 PÁGINA PRINCIPAL${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

check_file "app/admin/questionnaire-analytics/page.tsx" \
           "Página principal do dashboard"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📚 DOCUMENTAÇÃO${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

check_file "QUESTIONNAIRE_SOLUTION_SUMMARY.md" \
           "Resumo do problema e solução"

check_file "QUESTIONNAIRE_ANALYTICS_README.md" \
           "README com visão geral do sistema"

check_file "QUESTIONNAIRE_ANALYTICS_GUIDE.md" \
           "Guia de uso para usuários finais"

check_file "QUESTIONNAIRE_UI_DESIGN.md" \
           "Especificação visual e UX design"

check_file "QUESTIONNAIRE_QUICK_START.md" \
           "Setup rápido em 5 passos"

check_file "QUESTIONNAIRE_INTEGRATION_GUIDE.md" \
           "Guia de integração com código existente"

check_file "QUESTIONNAIRE_ANALYTICS_IMPLEMENTATION.md" \
           "Detalhes técnicos da implementação"

check_file "QUESTIONNAIRE_ARCHITECTURE.md" \
           "Diagramas e arquitetura do sistema"

check_file "QUESTIONNAIRE_FILES_INVENTORY.md" \
           "Inventário completo de arquivos"

check_file "FINAL_DELIVERY_REPORT.md" \
           "Relatório final de entrega"

check_file "prisma/QUESTIONNAIRE_ANALYTICS_SCHEMA.md" \
           "Schema do banco de dados"

check_file "QUESTIONNAIRE_PROJECT_COMPLETE.md" \
           "Resumo de conclusão do projeto"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}✅ VALIDAÇÕES ADICIONAIS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Verificar se componentes têm exports
check_content "components/questionnaires/questionnaire-analytics-dashboard.tsx" \
              "export.*QuestionnaireAnalyticsDashboard" \
              "Componente é exportado corretamente"

check_content "components/questionnaires/questionnaire-notifications-panel.tsx" \
              "export.*QuestionnaireNotificationsPanel" \
              "Componente é exportado corretamente"

check_content "components/questionnaires/questionnaire-insights.tsx" \
              "export.*QuestionnaireInsights" \
              "Componente é exportado corretamente"

check_content "components/questionnaires/questionnaire-alert-widget.tsx" \
              "export.*QuestionnaireAlertWidget" \
              "Componente é exportado corretamente"

# Verificar se APIs têm handlers
check_content "app/api/questionnaires/analytics/route.ts" \
              "export.*GET" \
              "API tem handler GET"

check_content "app/api/questionnaires/notifications/route.ts" \
              "export.*GET" \
              "API tem handler GET"

check_content "app/api/questionnaires/insights/route.ts" \
              "export.*GET" \
              "API tem handler GET"

# Verificar se serviço tem métodos
check_content "lib/questionnaire-notification-service.ts" \
              "static.*notifyQuestionnaireSent" \
              "Serviço tem método de notificação"

check_content "lib/questionnaire-notification-service.ts" \
              "static.*notifyQuestionnaireCompleted" \
              "Serviço tem método de conclusão"

check_content "lib/questionnaire-notification-service.ts" \
              "static.*notifyAIAnalysisReady" \
              "Serviço tem método de análise IA"

# Verificar se página tem autenticação
check_content "app/admin/questionnaire-analytics/page.tsx" \
              "getServerSession" \
              "Página tem autenticação"

check_content "app/admin/questionnaire-analytics/page.tsx" \
              "Suspense" \
              "Página usa Suspense para loading"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 RESUMO${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo "Total de Verificações: $TOTAL"
echo -e "${GREEN}Passou: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Falhou: $FAILED${NC}"
else
  echo -e "${GREEN}Falhou: $FAILED${NC}"
fi

echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                                                      ║${NC}"
  echo -e "${GREEN}║         ✅ TODAS AS VERIFICAÇÕES PASSARAM!           ║${NC}"
  echo -e "${GREEN}║                                                      ║${NC}"
  echo -e "${GREEN}║         Dashboard pronto para produção! 🚀           ║${NC}"
  echo -e "${GREEN}║                                                      ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Próximos passos:"
  echo "1. Ler: QUESTIONNAIRE_QUICK_START.md"
  echo "2. Executar setup"
  echo "3. Testar em http://localhost:3000/admin/questionnaire-analytics"
  echo ""
  exit 0
else
  echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                                                      ║${NC}"
  echo -e "${RED}║       ❌ ALGUMAS VERIFICAÇÕES FALHARAM                ║${NC}"
  echo -e "${RED}║                                                      ║${NC}"
  echo -e "${RED}║   Verifique os arquivos listados acima               ║${NC}"
  echo -e "${RED}║                                                      ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
  exit 1
fi
