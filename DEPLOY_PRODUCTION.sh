#!/bin/bash
# 🚀 QUICK START - DEPLOY EM PRODUÇÃO

# Este arquivo contém os comandos necessários para deploy após sanitização

# ============================================================================
# PASSO 1: BACKUP DO BANCO DE DADOS
# ============================================================================
echo "1️⃣  Fazendo backup do banco de dados..."
docker compose exec postgres pg_dump -U healthcare healthcare_db > backup-$(date +%Y%m%d_%H%M%S).sql
echo "✅ Backup realizado"

# ============================================================================
# PASSO 2: LIMPEZA DE DADOS FICCIONAIS
# ============================================================================
echo ""
echo "2️⃣  Limpando dados fictícios..."
bash scripts/production-cleanup.sh
echo "✅ Limpeza concluída"

# ============================================================================
# PASSO 3: BUILD DE PRODUÇÃO
# ============================================================================
echo ""
echo "3️⃣  Build de produção..."
npm run db:generate
npm run db:migrate:deploy
npm run build
echo "✅ Build concluído"

# ============================================================================
# PASSO 4: INICIAR SISTEMA
# ============================================================================
echo ""
echo "4️⃣  Iniciando sistema..."
docker compose -f docker-compose.prod.yml up -d --build
echo "✅ Sistema iniciado"

# ============================================================================
# PASSO 5: VALIDAÇÃO
# ============================================================================
echo ""
echo "5️⃣  Validando sistema..."
sleep 5
curl http://localhost:3000/api/health
echo ""
echo "✅ Validação concluída"

# ============================================================================
# CONCLUSÃO
# ============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ SISTEMA EM PRODUÇÃO COM DADOS REAIS APENAS              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Sistema disponível em: http://seu-dominio.com"
echo ""
echo "Login padrão:"
echo "  Email: admin@healthcare.com"
echo "  Senha: admin123 (MUDAR IMEDIATAMENTE!)"
echo ""
