#!/bin/bash

# Script de Criação de Profissionais - Healthcare
# Uso: ./scripts/create-professional.sh

set -e

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║     Criador de Profissionais - Healthcare System       ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Validar que estamos no diretório correto
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Erro: Execute este script na raiz do projeto${NC}"
  exit 1
fi

# Função para validar email
validate_email() {
  local email="$1"
  if [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    return 0
  else
    return 1
  fi
}

# Coletar informações
echo -e "${YELLOW}Informações do Profissional:${NC}"
echo ""

read -p "Nome completo: " NAME
if [ -z "$NAME" ]; then
  echo -e "${RED}❌ Nome é obrigatório${NC}"
  exit 1
fi

read -p "Email: " EMAIL
if ! validate_email "$EMAIL"; then
  echo -e "${RED}❌ Email inválido${NC}"
  exit 1
fi

echo ""
echo "Profissões disponíveis:"
echo "  1. DOCTOR (Médico)"
echo "  2. NURSE (Enfermeiro)"
echo "  3. PHYSIOTHERAPIST (Fisioterapeuta)"
echo "  4. PSYCHOLOGIST (Psicólogo)"
echo "  5. DENTIST (Dentista)"
echo "  6. NUTRITIONIST (Nutricionista)"
echo "  7. HEALTH_AGENT (Agente de Saúde)"
echo "  8. TECHNICIAN (Técnico)"
echo "  9. PHARMACIST (Farmacêutico)"
echo "  10. SOCIAL_WORKER (Assistente Social)"
echo ""
read -p "Escolha (1-10): " ROLE_CHOICE

case $ROLE_CHOICE in
  1) ROLE="DOCTOR" ;;
  2) ROLE="NURSE" ;;
  3) ROLE="PHYSIOTHERAPIST" ;;
  4) ROLE="PSYCHOLOGIST" ;;
  5) ROLE="DENTIST" ;;
  6) ROLE="NUTRITIONIST" ;;
  7) ROLE="HEALTH_AGENT" ;;
  8) ROLE="TECHNICIAN" ;;
  9) ROLE="PHARMACIST" ;;
  10) ROLE="SOCIAL_WORKER" ;;
  *) 
    echo -e "${RED}❌ Opção inválida${NC}"
    exit 1
    ;;
esac

read -p "Número de Registro (ex: CRM/PR 12345) [opcional]: " CRM_NUMBER

echo ""
echo -e "${YELLOW}Resumo:${NC}"
echo "  Nome: $NAME"
echo "  Email: $EMAIL"
echo "  Profissão: $ROLE"
echo "  Registro: ${CRM_NUMBER:-Não informado}"
echo ""

read -p "Confirmar? (s/n): " CONFIRM
if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
  echo -e "${RED}Cancelado${NC}"
  exit 0
fi

# Criando profissional via Node.js script
echo ""
echo -e "${YELLOW}Criando profissional...${NC}"

cat > /tmp/create-prof.js << 'EOF'
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function createProfessional(name, email, role, crmNumber) {
  try {
    // Validar email único
    const exists = await prisma.user.findUnique({
      where: { email }
    })

    if (exists) {
      throw new Error('Email já cadastrado no sistema')
    }

    const userId = `user_${crypto.randomBytes(8).toString('hex')}`

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        role,
        crmNumber: crmNumber || null,
        isActive: true,
        emailVerified: new Date()
      }
    })

    // Atribuir role primária
    await prisma.userAssignedRole.create({
      data: {
        id: `role_${crypto.randomBytes(8).toString('hex')}`,
        userId: user.id,
        role: role,
        isPrimary: true,
        assignedAt: new Date()
      }
    })

    // Atribuir role PATIENT para acessar prontuário próprio
    await prisma.userAssignedRole.create({
      data: {
        id: `role_${crypto.randomBytes(8).toString('hex')}`,
        userId: user.id,
        role: 'PATIENT',
        isPrimary: false,
        assignedAt: new Date()
      }
    })

    console.log('✅ Profissional criado com sucesso!')
    console.log(`   ID: ${user.id}`)
    console.log(`   Nome: ${user.name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Profissão: ${user.role}`)
    console.log(`   Roles: ${role} (primária), PATIENT`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

const name = process.argv[2]
const email = process.argv[3]
const role = process.argv[4]
const crmNumber = process.argv[5]

createProfessional(name, email, role, crmNumber)
EOF

node /tmp/create-prof.js "$NAME" "$EMAIL" "$ROLE" "$CRM_NUMBER"

echo ""
echo -e "${GREEN}✨ Processo concluído!${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "  1. O profissional receberá um email com credenciais de acesso"
echo "  2. Primeiro acesso: defina sua senha"
echo "  3. Configure sua agenda de atendimento"
echo "  4. Comece a usar o sistema"
echo ""
