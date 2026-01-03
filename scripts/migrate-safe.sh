#!/bin/bash

# ============================================
# SAFE DATABASE MIGRATION SCRIPT
# SEMPRE faz backup antes de qualquer mudança
# ============================================

set -e

echo "🔒 PROCEDIMENTO SEGURO DE MIGRAÇÃO DO BANCO"
echo "=============================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Backup
echo -e "${BLUE}[PASSO 1]${NC} Criando backup do banco de dados..."
echo ""

if [ -f "scripts/backup-database.sh" ]; then
    bash scripts/backup-database.sh
    BACKUP_STATUS=$?
else
    echo -e "${RED}❌ Script de backup não encontrado!${NC}"
    exit 1
fi

if [ $BACKUP_STATUS -ne 0 ]; then
    echo -e "${RED}❌ Backup falhou! Abortando migração.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Backup concluído com sucesso!${NC}"
echo ""

# Step 2: Verificar mudanças no schema
echo -e "${BLUE}[PASSO 2]${NC} Verificando mudanças no Prisma schema..."
echo ""

if [ -f "prisma/schema.prisma" ]; then
    echo -e "${YELLOW}⚠️  Migrações pendentes a executar:${NC}"
    npx prisma migrate status 2>&1 || true
    echo ""
else
    echo -e "${RED}❌ Schema Prisma não encontrado!${NC}"
    exit 1
fi

# Step 3: Confirmação do usuário
echo ""
echo -e "${YELLOW}⚠️  ATENÇÃO - VOCÊ ESTÁ PRESTES A:${NC}"
echo "  1. Aplicar novas migrações ao banco de dados"
echo "  2. Regenerar o Prisma Client"
echo ""
echo -e "${YELLOW}✅ SEU BACKUP ESTÁ SEGURO EM:${NC}"
ls -lah /home/umbrel/backups/healthcare/healthcare_*.sql.gz 2>/dev/null | tail -1 || echo "  (Verifique /home/umbrel/backups/healthcare/)"
echo ""
read -p "Deseja continuar? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}❌ Migração cancelada pelo usuário.${NC}"
    exit 0
fi

# Step 4: Aplicar migrações
echo ""
echo -e "${BLUE}[PASSO 3]${NC} Aplicando migrações..."
echo ""

if npx prisma migrate deploy; then
    echo -e "${GREEN}✅ Migrações aplicadas com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao aplicar migrações!${NC}"
    echo -e "${YELLOW}💡 Para restaurar de um backup anterior, execute:${NC}"
    echo "   bash scripts/restore-database.sh"
    exit 1
fi

# Step 5: Gerar Prisma Client
echo ""
echo -e "${BLUE}[PASSO 4]${NC} Regenerando Prisma Client..."
echo ""

if npx prisma generate; then
    echo -e "${GREEN}✅ Prisma Client gerado com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao gerar Prisma Client!${NC}"
    exit 1
fi

# Step 6: Verificar integridade
echo ""
echo -e "${BLUE}[PASSO 5]${NC} Verificando integridade do banco..."
echo ""

if docker exec healthcare-db psql -U healthcare -d healthcare_db -c "SELECT 'OK' as status;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Banco de dados íntegro!${NC}"
else
    echo -e "${RED}❌ Erro ao conectar ao banco de dados!${NC}"
    exit 1
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
echo "=============================================="
echo ""
echo -e "${BLUE}📊 Status do Banco:${NC}"
echo ""

docker exec healthcare-db psql -U healthcare -d healthcare_db -c "
  SELECT 
    (SELECT COUNT(*) FROM patients) as \"👥 Pacientes\",
    (SELECT COUNT(*) FROM patient_questionnaires) as \"📋 Questionários\",
    (SELECT COUNT(*) FROM consultations WHERE status NOT IN ('CANCELLED')) as \"📅 Agendamentos\",
    (SELECT COUNT(*) FROM users) as \"👤 Usuários\"
;" 2>/dev/null || echo "  (Erro ao conectar)"

echo ""
echo -e "${GREEN}✅ Seu backup está seguro!${NC}"
echo "   Consulte /home/umbrel/backups/healthcare/ para restaurar se necessário"
echo ""
