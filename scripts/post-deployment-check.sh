#!/bin/bash

# Script para verificar o status do sistema após o deployment
# Executa uma série de verificações para garantir que todos os componentes estão funcionando corretamente

# Definir cores para saída
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Função para exibir mensagens de sucesso
success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Função para exibir mensagens de erro
error() {
  echo -e "${RED}✗ $1${NC}"
  ERRORS=$((ERRORS+1))
}

# Função para exibir mensagens de aviso
warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
  WARNINGS=$((WARNINGS+1))
}

# Função para verificar se um serviço está rodando
check_service() {
  SERVICE=$1
  echo "Verificando serviço: $SERVICE..."
  
  if docker-compose -f docker-compose.prod.yml ps | grep $SERVICE | grep "Up" > /dev/null; then
    success "Serviço $SERVICE está rodando"
  else
    error "Serviço $SERVICE não está rodando corretamente"
  fi
}

# Função para verificar status da API
check_api() {
  ENDPOINT=$1
  DESCRIPTION=$2
  echo "Verificando API: $DESCRIPTION..."
  
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/$ENDPOINT)
  if [ "$STATUS" -eq 200 ]; then
    success "API $DESCRIPTION está funcionando (status $STATUS)"
  else
    error "API $DESCRIPTION retornou status $STATUS"
  fi
}

# Função para verificar espaço em disco
check_disk_space() {
  echo "Verificando espaço em disco..."
  
  DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
  if [ "$DISK_USAGE" -gt 85 ]; then
    warning "Espaço em disco está em $DISK_USAGE% de uso (recomendado < 85%)"
  else
    success "Espaço em disco OK ($DISK_USAGE% em uso)"
  fi
}

# Função para verificar uso de memória
check_memory() {
  echo "Verificando uso de memória..."
  
  MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
  if [ "$MEM_USAGE" -gt 90 ]; then
    warning "Uso de memória está em $MEM_USAGE% (recomendado < 90%)"
  else
    success "Uso de memória OK ($MEM_USAGE%)"
  fi
}

# Função para verificar backups
check_backups() {
  echo "Verificando backups..."
  
  if [ -d "/var/backups/healthcare" ]; then
    LAST_BACKUP=$(find /var/backups/healthcare -name "healthcare_db_*.sql" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")
    if [ -z "$LAST_BACKUP" ]; then
      warning "Diretório de backup existe, mas nenhum arquivo de backup encontrado"
    else
      BACKUP_TIME=$(stat -c %Y "$LAST_BACKUP")
      CURRENT_TIME=$(date +%s)
      DIFF_HOURS=$(( (CURRENT_TIME - BACKUP_TIME) / 3600 ))
      
      if [ "$DIFF_HOURS" -gt 24 ]; then
        warning "Último backup tem mais de 24 horas ($DIFF_HOURS horas atrás)"
      else
        success "Backup recente encontrado ($DIFF_HOURS horas atrás)"
      fi
    fi
  else
    error "Diretório de backup não encontrado em /var/backups/healthcare"
  fi
}

# Função para verificar logs em busca de erros
check_logs_for_errors() {
  echo "Verificando logs por erros críticos..."
  
  ERROR_COUNT=$(docker-compose -f docker-compose.prod.yml logs --tail=1000 app | grep -i "error\|exception\|fatal" | wc -l)
  if [ "$ERROR_COUNT" -gt 0 ]; then
    warning "Encontrados $ERROR_COUNT erros nos últimos 1000 logs"
  else
    success "Nenhum erro encontrado nos últimos 1000 logs"
  fi
}

# Função para verificar status do banco de dados
check_database() {
  echo "Verificando conexão com o banco de dados..."
  
  if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U healthcare > /dev/null 2>&1; then
    success "Conexão com o banco de dados OK"
    
    # Verificar tamanho do banco
    DB_SIZE=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U healthcare -c "SELECT pg_size_pretty(pg_database_size('healthcare_db'));" | grep -v "row\|pg_size_pretty" | tr -d '[:space:]')
    success "Tamanho atual do banco de dados: $DB_SIZE"
  else
    error "Não foi possível conectar ao banco de dados"
  fi
}

# Função para verificar status do Ollama
check_ollama() {
  echo "Verificando serviço Ollama..."
  
  if curl -s http://localhost:11434/api/tags | grep -q "llama3"; then
    success "Serviço Ollama está rodando e modelo llama3 está disponível"
  else
    error "Serviço Ollama não está respondendo ou modelo llama3 não está disponível"
  fi
}

# Função para verificar redirecionamento SSL
check_ssl() {
  echo "Verificando configuração SSL..."
  
  if [ -f "/etc/nginx/sites-available/healthcare" ]; then
    if grep -q "ssl_certificate" /etc/nginx/sites-available/healthcare; then
      SSL_CERT=$(grep "ssl_certificate " /etc/nginx/sites-available/healthcare | awk '{print $2}' | tr -d ';')
      if [ -f "$SSL_CERT" ]; then
        # Verificar data de expiração
        EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$SSL_CERT" | cut -d= -f2)
        EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
        CURRENT_EPOCH=$(date +%s)
        DAYS_REMAINING=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
        
        if [ "$DAYS_REMAINING" -lt 30 ]; then
          warning "Certificado SSL expira em $DAYS_REMAINING dias"
        else
          success "Certificado SSL válido (expira em $DAYS_REMAINING dias)"
        fi
      else
        error "Arquivo de certificado SSL não encontrado: $SSL_CERT"
      fi
    else
      warning "Configuração NGINX encontrada, mas SSL não está configurado"
    fi
  else
    warning "Configuração NGINX não encontrada, não foi possível verificar SSL"
  fi
}

# Verificar permissões de arquivos críticos
check_permissions() {
  echo "Verificando permissões de arquivos críticos..."
  
  PROD_ENV="/opt/healthcare/.env.production"
  if [ -f "$PROD_ENV" ]; then
    PERMS=$(stat -c "%a" "$PROD_ENV")
    if [ "$PERMS" != "600" ]; then
      error "Permissões incorretas para .env.production: $PERMS (deveria ser 600)"
    else
      success "Permissões corretas para .env.production"
    fi
  else
    warning "Arquivo .env.production não encontrado em /opt/healthcare"
  fi
}

# Contadores de problemas
ERRORS=0
WARNINGS=0

echo "===== VERIFICAÇÃO PÓS-DEPLOYMENT DO HEALTHCARE ====="
echo "Data: $(date)"
echo "Hostname: $(hostname)"
echo "=====================================================\n"

# Executar todas as verificações
check_service "app"
check_service "postgres"
check_service "redis"
check_service "ollama"
echo ""

check_api "health" "verificação de saúde"
check_api "patients/count" "contagem de pacientes"
echo ""

check_disk_space
check_memory
echo ""

check_backups
check_logs_for_errors
echo ""

check_database
check_ollama
echo ""

check_ssl
check_permissions
echo ""

# Resumo final
echo "=====================================================\n"
echo "RESUMO DA VERIFICAÇÃO:"
echo "---------------------"
if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}✓ Todos os sistemas estão funcionando corretamente!${NC}"
else
  if [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}✗ Erros encontrados: $ERRORS${NC}"
  fi
  if [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Avisos encontrados: $WARNINGS${NC}"
  fi
  echo ""
  echo "Por favor, corrija os problemas acima antes de liberar o sistema para os usuários."
fi
echo ""
echo "Para suporte adicional, contate a equipe técnica em suporte@healthcare.com"
echo "=====================================================\n"

exit $ERRORS
