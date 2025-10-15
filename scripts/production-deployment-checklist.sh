#!/bin/bash
# PRODUCTION_DEPLOYMENT_CHECKLIST.sh
# Script interativo para validar readiness de produção
# Uso: bash ./scripts/production-deployment-checklist.sh

set -euo pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0
WARNINGS=0

# Funções
print_header() {
    echo -e "\n${BLUE}===============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===============================================${NC}"
}

check_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARNINGS++))
}

# === PHASE 1: Code & Build ===
print_header "PHASE 1: Code & Build Verification"

# 1.1 TypeScript compilation
echo "1.1 Checking TypeScript compilation..."
if npm run type-check > /dev/null 2>&1; then
    check_pass "TypeScript compilation successful"
else
    check_fail "TypeScript compilation failed - fix before deployment"
fi

# 1.2 Lint
echo "1.2 Checking ESLint..."
if npm run lint > /dev/null 2>&1; then
    check_pass "Lint check passed"
else
    check_warn "Lint warnings detected (non-blocking)"
fi

# 1.3 Build
echo "1.3 Building Next.js app..."
if npm run build > /dev/null 2>&1; then
    check_pass "Build successful"
else
    check_fail "Build failed - cannot deploy"
fi

# === PHASE 2: Environment ===
print_header "PHASE 2: Environment Configuration"

# 2.1 Required env vars
echo "2.1 Checking required environment variables..."
REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL" "NODE_ENV")

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        check_fail "Missing required env var: $var"
    else
        check_pass "Environment var set: $var"
    fi
done

# 2.2 NODE_ENV production
echo "2.2 Checking NODE_ENV..."
if [[ "${NODE_ENV}" == "production" ]]; then
    check_pass "NODE_ENV is production"
else
    check_warn "NODE_ENV is not production (current: ${NODE_ENV})"
fi

# 2.3 NEXTAUTH_SECRET strength
echo "2.3 Checking NEXTAUTH_SECRET strength..."
if [[ ${#NEXTAUTH_SECRET} -ge 32 ]]; then
    check_pass "NEXTAUTH_SECRET is strong (${#NEXTAUTH_SECRET} chars)"
else
    check_fail "NEXTAUTH_SECRET too short (${#NEXTAUTH_SECRET} chars, minimum 32)"
fi

# === PHASE 3: Database ===
print_header "PHASE 3: Database Readiness"

# 3.1 Database connection
echo "3.1 Testing database connection..."
if npx prisma db execute --stdin > /dev/null 2>&1 <<< "SELECT 1"; then
    check_pass "Database connection successful"
else
    check_fail "Cannot connect to database - verify DATABASE_URL"
fi

# 3.2 Prisma migrations
echo "3.2 Checking pending migrations..."
if npx prisma migrate status > /dev/null 2>&1; then
    STATUS=$(npx prisma migrate status 2>&1 || true)
    if echo "$STATUS" | grep -q "Database is up to date"; then
        check_pass "All migrations applied"
    else
        check_warn "Pending migrations detected"
    fi
else
    check_warn "Cannot check migration status"
fi

# === PHASE 4: Security ===
print_header "PHASE 4: Security Checks"

# 4.1 Secrets in code
echo "4.1 Checking for secrets in code..."
if grep -r "NEXTAUTH_SECRET\|DATABASE_PASSWORD\|API_KEY" \
    --include="*.ts" --include="*.js" --include="*.tsx" \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    2>/dev/null | grep -v ".env" | grep -v "process.env"; then
    check_fail "Found hardcoded secrets in code!"
else
    check_pass "No hardcoded secrets detected"
fi

# 4.2 .gitignore
echo "4.2 Checking .gitignore..."
if grep -q "\.env" .gitignore; then
    check_pass ".env files are gitignored"
else
    check_fail ".env files NOT gitignored - risk of secret leak"
fi

# 4.3 CORS configuration
echo "4.3 Checking CORS setup..."
if grep -q "CORS\|Access-Control" middleware.ts; then
    check_pass "CORS headers configured"
else
    check_warn "CORS headers not found - verify manually"
fi

# === PHASE 5: Docker ===
print_header "PHASE 5: Docker & Deployment"

# 5.1 Docker image
echo "5.1 Building Docker image..."
if docker build -t healthcare:prod . > /dev/null 2>&1; then
    check_pass "Docker image builds successfully"
else
    check_fail "Docker build failed"
fi

# 5.2 Docker compose prod
echo "5.2 Checking docker-compose.prod.yml..."
if [[ -f "docker-compose.prod.yml" ]]; then
    check_pass "Production compose file exists"
    
    # Check for required services
    if grep -q "postgres:" docker-compose.prod.yml; then
        check_pass "PostgreSQL service defined"
    fi
    if grep -q "redis:" docker-compose.prod.yml; then
        check_pass "Redis service defined"
    fi
else
    check_fail "docker-compose.prod.yml not found"
fi

# === PHASE 6: Tests ===
print_header "PHASE 6: Test Coverage"

# 6.1 Security tests
echo "6.1 Running security tests..."
if npm test > /dev/null 2>&1; then
    check_pass "Test suite passed"
else
    check_warn "Tests failed or not configured"
fi

# === PHASE 7: Performance ===
print_header "PHASE 7: Performance Checks"

# 7.1 Build output size
echo "7.1 Checking Next.js build output size..."
if [[ -f ".next/static/chunks/main.js" ]]; then
    SIZE=$(du -sh .next | cut -f1)
    check_pass "Build size: $SIZE"
else
    check_warn "Build not found - run 'npm run build' first"
fi

# === Summary ===
print_header "DEPLOYMENT READINESS SUMMARY"

TOTAL=$((PASSED + FAILED + WARNINGS))
SCORE=$((PASSED * 100 / TOTAL))

echo "Passed:   $PASSED"
echo "Failed:   $FAILED"
echo "Warnings: $WARNINGS"
echo "Total:    $TOTAL"
echo ""
echo "Score:    ${SCORE}%"

if [[ $FAILED -eq 0 ]]; then
    if [[ $WARNINGS -eq 0 ]]; then
        echo -e "${GREEN}✓ READY FOR DEPLOYMENT${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠ READY WITH WARNINGS - REVIEW BEFORE DEPLOY${NC}"
        exit 0
    fi
else
    echo -e "${RED}✗ NOT READY FOR DEPLOYMENT - FIX FAILURES${NC}"
    exit 1
fi
