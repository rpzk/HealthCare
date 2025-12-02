#!/bin/bash
# =====================================================
# Script de Health Check - HealthCare
# Verifica status de todos os componentes do sistema
# =====================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 HealthCare - Verificação de Saúde do Sistema"
echo "📅 $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Contadores
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

check_pass() {
    echo "✅ $1"
    ((CHECKS_PASSED++))
}

check_fail() {
    echo "❌ $1"
    ((CHECKS_FAILED++))
}

check_warn() {
    echo "⚠️  $1"
    ((WARNINGS++))
}

# 1. Verificar PostgreSQL
echo "📦 Verificando Banco de Dados..."
if pg_isready -h localhost -p 5432 -U healthcare &>/dev/null; then
    check_pass "PostgreSQL está rodando"
    
    # Verificar conexão
    POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" /home/umbrel/HealthCare/.env | cut -d'=' -f2)
    if PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -U healthcare -d healthcare_db -c "SELECT 1" &>/dev/null; then
        check_pass "Conexão com banco OK"
        
        # Contar registros importantes
        USERS=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -U healthcare -d healthcare_db -t -c "SELECT COUNT(*) FROM users" 2>/dev/null | tr -d ' ')
        PATIENTS=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -U healthcare -d healthcare_db -t -c "SELECT COUNT(*) FROM patients" 2>/dev/null | tr -d ' ')
        CONSULTATIONS=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -U healthcare -d healthcare_db -t -c "SELECT COUNT(*) FROM consultations" 2>/dev/null | tr -d ' ')
        
        echo "   📊 Usuários: $USERS | Pacientes: $PATIENTS | Consultas: $CONSULTATIONS"
    else
        check_fail "Falha na conexão com banco"
    fi
else
    check_fail "PostgreSQL não está rodando"
fi

echo ""

# 2. Verificar Redis
echo "📦 Verificando Cache (Redis)..."
if redis-cli ping &>/dev/null; then
    check_pass "Redis está rodando"
else
    check_warn "Redis não disponível (opcional)"
fi

echo ""

# 3. Verificar arquivos de configuração
echo "📄 Verificando Configurações..."

if [ -f "/home/umbrel/HealthCare/.env" ]; then
    check_pass "Arquivo .env existe"
    
    # Verificar chaves críticas
    if grep -q "^ENCRYPTION_KEY=" /home/umbrel/HealthCare/.env; then
        check_pass "ENCRYPTION_KEY configurada"
    else
        check_fail "ENCRYPTION_KEY não configurada!"
    fi
    
    if grep -q "^HASH_SALT=" /home/umbrel/HealthCare/.env; then
        check_pass "HASH_SALT configurado"
    else
        check_fail "HASH_SALT não configurado!"
    fi
    
    if grep -q "^NEXTAUTH_SECRET=" /home/umbrel/HealthCare/.env; then
        check_pass "NEXTAUTH_SECRET configurado"
    else
        check_fail "NEXTAUTH_SECRET não configurado!"
    fi
else
    check_fail "Arquivo .env não encontrado!"
fi

echo ""

# 4. Verificar backups
echo "💾 Verificando Backups..."
BACKUP_DIR="/home/umbrel/backups/healthcare"

if [ -d "$BACKUP_DIR" ]; then
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/healthcare_*.sql.gz 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        check_pass "Encontrados $BACKUP_COUNT backups"
        
        # Verificar backup mais recente
        LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/healthcare_*.sql.gz 2>/dev/null | head -1)
        if [ -n "$LATEST_BACKUP" ]; then
            BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 86400 ))
            if [ "$BACKUP_AGE" -lt 2 ]; then
                check_pass "Backup mais recente: $(basename $LATEST_BACKUP) ($BACKUP_AGE dias)"
            else
                check_warn "Backup mais recente tem $BACKUP_AGE dias!"
            fi
        fi
    else
        check_warn "Nenhum backup encontrado"
    fi
else
    check_warn "Diretório de backups não existe"
fi

echo ""

# 5. Verificar espaço em disco
echo "💿 Verificando Espaço em Disco..."
DISK_USE=$(df -h /home/umbrel | awk 'NR==2 {print $5}' | tr -d '%')
DISK_AVAIL=$(df -h /home/umbrel | awk 'NR==2 {print $4}')

if [ "$DISK_USE" -lt 80 ]; then
    check_pass "Uso do disco: ${DISK_USE}% (disponível: $DISK_AVAIL)"
elif [ "$DISK_USE" -lt 90 ]; then
    check_warn "Uso do disco: ${DISK_USE}% - considere limpeza"
else
    check_fail "Disco quase cheio: ${DISK_USE}%!"
fi

echo ""

# 6. Verificar aplicação Next.js
echo "🌐 Verificando Aplicação Web..."
APP_URL=$(grep "^NEXTAUTH_URL=" /home/umbrel/HealthCare/.env | cut -d'=' -f2)
if [ -n "$APP_URL" ]; then
    if curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/health" 2>/dev/null | grep -q "200"; then
        check_pass "API respondendo em $APP_URL"
    else
        # Tentar localhost
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/health" 2>/dev/null | grep -q "200"; then
            check_pass "API respondendo em localhost:3000"
        else
            check_warn "API pode não estar rodando (verificar manualmente)"
        fi
    fi
else
    check_warn "NEXTAUTH_URL não configurada"
fi

echo ""

# Resumo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   ✅ Passou:   $CHECKS_PASSED"
echo "   ⚠️  Avisos:   $WARNINGS"
echo "   ❌ Falhou:   $CHECKS_FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$CHECKS_FAILED" -gt 0 ]; then
    echo ""
    echo "⚠️  Sistema requer atenção! Corrija os itens marcados com ❌"
    exit 1
else
    echo ""
    echo "✅ Sistema está saudável!"
    exit 0
fi
