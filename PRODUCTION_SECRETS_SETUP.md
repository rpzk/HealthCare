# 🔐 Production Secrets & Environment Setup Guide

## Quick Start - 15 Minutes

### 1. Gerar Secrets Seguros

```bash
# NEXTAUTH_SECRET (32+ caracteres aleatórios)
openssl rand -base64 32
# Exemplo output: 8qZX9Kd+3Lm7Np0Wv=vZ2Bc/F1Gh4Ij5Kl=

# POSTGRES_PASSWORD (strong password)
openssl rand -base64 24
# Exemplo output: aB7Cd/EfG8HiJkLmNoPqRsT=

# NEXTAUTH_JWT_SECRET (alternativo se não usar SESSION)
openssl rand -base64 32
```

### 2. Criar Production Secrets File

**File: `.secrets.prod`** (NEVER COMMIT)

```env
# ============================================
# 🔐 PRODUCTION SECRETS - KEEP SECURE! 🔐
# ============================================

# NextAuth
NEXTAUTH_SECRET=8qZX9Kd+3Lm7Np0Wv=vZ2Bc/F1Gh4Ij5Kl=
NEXTAUTH_URL=https://seu-dominio.com
NEXTAUTH_URL_INTERNAL=http://app:3000

# Database
DATABASE_URL=postgresql://healthcare:aB7Cd/EfG8HiJkLmNoPqRsT=@postgres:5432/healthcare_db
POSTGRES_PASSWORD=aB7Cd/EfG8HiJkLmNoPqRsT=

# AI/Ollama
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3

# Redis (opcional, se usar auth)
REDIS_PASSWORD=xYz1Qw2Er3Ty4Ui5=

# Application
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Optional: AI Quota
AI_QUOTA_LIMIT=100
AI_QUOTA_WINDOW_MINUTES=60

# Optional: Observability
TRACE_ENABLED=true
TRACE_SAMPLE_RATE=0.1
```

### 3. Adicionar ao `.gitignore`

```bash
# Security
.env.prod
.env.production
.secrets.prod
.secrets.production
.nextauth.secret
*.key
*.pem

# Do not track
node_modules/
.next/
dist/
build/

# Environment
.env.local
.env.*.local
```

### 4. Atualizar `.env.example`

**File: `.env.example`**

```env
# ============================================
# Production Environment Variables
# ============================================

# NextAuth (REQUIRED - set strong secret in production)
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000

# Database (REQUIRED)
DATABASE_URL="postgresql://healthcare:password@localhost:5432/healthcare_db"
POSTGRES_PASSWORD="strong_password_here"

# Application
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# AI/Ollama (OPTIONAL)
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3

# Redis (OPTIONAL)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# Observability (OPTIONAL)
TRACE_ENABLED=true
TRACE_SAMPLE_RATE=0.1
LOG_LEVEL=info
```

---

## 🐳 Docker Deployment with Secrets

### Opção 1: Environment Variables (Docker Compose)

**docker-compose.prod.yml:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: healthcare
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: healthcare_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - healthcare-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U healthcare"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    networks:
      - healthcare-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://healthcare:${POSTGRES_PASSWORD}@postgres:5432/healthcare_db
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_URL_INTERNAL: http://app:3000
      NODE_ENV: production
      PORT: 3000
      OLLAMA_URL: http://ollama:11434
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - healthcare-network
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:3000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 15

volumes:
  postgres_data:

networks:
  healthcare-network:
    driver: bridge
```

**Deploy com secrets:**

```bash
# Usar arquivo .secrets.prod
export $(cat .secrets.prod | xargs)

# Deploy
docker compose -f docker-compose.prod.yml up -d

# Verificar
docker compose logs app
docker compose exec app npm run db:migrate:deploy
```

---

### Opção 2: Docker Secrets (Kubernetes-style)

**docker-compose.prod.yml (com secrets):**

```yaml
version: '3.8'

services:
  app:
    build: .
    environment:
      DATABASE_URL_FILE: /run/secrets/database_url
      NEXTAUTH_SECRET_FILE: /run/secrets/nextauth_secret
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
      NODE_ENV: production
    secrets:
      - database_url
      - nextauth_secret
      - postgres_password
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - healthcare-network

secrets:
  database_url:
    file: ./.secrets/database_url
  nextauth_secret:
    file: ./.secrets/nextauth_secret
  postgres_password:
    file: ./.secrets/postgres_password
```

**Setup:**

```bash
mkdir -p .secrets
echo "postgresql://healthcare:password@postgres:5432/healthcare_db" > .secrets/database_url
openssl rand -base64 32 > .secrets/nextauth_secret
openssl rand -base64 24 > .secrets/postgres_password

# Permissões seguras
chmod 600 .secrets/*

# Deploy
docker compose -f docker-compose.prod.yml up -d
```

---

## 🔑 AWS Secrets Manager (Recomendado para Produção)

### Setup

```bash
# 1. Criar secrets no AWS
aws secretsmanager create-secret \
  --name healthcare/prod/nextauth_secret \
  --secret-string "$(openssl rand -base64 32)"

aws secretsmanager create-secret \
  --name healthcare/prod/postgres_password \
  --secret-string "$(openssl rand -base64 24)"

# 2. IAM Policy para ECS/Fargate
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:healthcare/prod/*"
    }
  ]
}

# 3. ECS Task Definition
{
  "family": "healthcare-app",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/healthcare:latest",
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "NEXTAUTH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:healthcare/prod/nextauth_secret"
        },
        {
          "name": "POSTGRES_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:healthcare/prod/postgres_password"
        }
      ]
    }
  ]
}
```

---

## 🛡️ Security Best Practices

### ✅ DO:

```bash
# ✓ Gerar secrets aleatórios fortes
openssl rand -base64 32

# ✓ Usar arquivo separado (.secrets.prod)
export $(cat .secrets.prod | xargs)

# ✓ Restringir permissões de arquivo
chmod 600 .secrets.prod

# ✓ Fazer backup de secrets (criptografado)
gpg --symmetric .secrets.prod

# ✓ Rotacionar secrets regularmente
# Cada 90 dias mínimo

# ✓ Usar HTTPS em produção
# Obrigatório com NextAuth

# ✓ Verificar variáveis no startup
# npm run validate:env
```

### ❌ DON'T:

```bash
# ✗ Não commit secrets em Git
git add .secrets.prod  # NÃO FAÇA ISSO!

# ✗ Não use secrets fracos
NEXTAUTH_SECRET=12345  # Fraco!

# ✗ Não hardcode secrets
const secret = "abc123xyz"  // NÃO FAÇA ISSO!

# ✗ Não deixe secrets em logs
console.log(process.env.NEXTAUTH_SECRET)  // NÃO FAÇA ISSO!

# ✗ Não compartilhe secrets por email
# Sempre use Secret Manager

# ✗ Não armazene sem encripção
# Use AWS Secrets Manager ou Vault
```

---

## 🔍 Validação de Secrets

### Script de Validação

**scripts/validate-env.ts**

```typescript
import { z } from 'zod'

const envSchema = z.object({
  // Required
  NODE_ENV: z.enum(['production', 'development', 'test']),
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // Optional
  OLLAMA_URL: z.string().url().optional(),
  OLLAMA_MODEL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  PORT: z.string().default('3000'),
})

try {
  const config = envSchema.parse(process.env)
  console.log('✓ All environment variables valid')
  process.exit(0)
} catch (error) {
  console.error('✗ Invalid environment variables:')
  console.error(error)
  process.exit(1)
}
```

**Usar no startup:**

```bash
npm run validate:env && npm start
```

---

## 🚀 Production Deployment Checklist

- [ ] Generate all secrets (`openssl rand -base64 32`)
- [ ] Create `.secrets.prod` file (NOT IN GIT)
- [ ] Update `.gitignore` with `.secrets*`
- [ ] Set `NODE_ENV=production`
- [ ] Set `NEXTAUTH_URL=https://seu-dominio.com`
- [ ] Set `NEXTAUTH_URL_INTERNAL=http://app:3000` (internal)
- [ ] Generate strong `POSTGRES_PASSWORD`
- [ ] Configure database backups
- [ ] Setup SSL/TLS certificate
- [ ] Configure firewall rules
- [ ] Test health endpoint: `GET /api/health`
- [ ] Verify database migrations run
- [ ] Monitor logs for errors
- [ ] Test user login
- [ ] Test medical records CRUD
- [ ] Verify rate limiting active

---

## 🆘 Troubleshooting

### Secret não encontrado

```bash
# Verificar se variável está set
echo $NEXTAUTH_SECRET

# Verificar se arquivo existe
ls -la .secrets.prod

# Reload variables
source .secrets.prod
```

### Database connection failed

```bash
# Verificar DATABASE_URL format
echo $DATABASE_URL
# Expected: postgresql://user:password@host:port/dbname

# Testar conexão
psql "$DATABASE_URL" -c "SELECT 1"
```

### NEXTAUTH_SECRET muito fraco

```bash
# Gerar novo
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo $NEXTAUTH_SECRET

# Atualizar .secrets.prod
sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=$NEXTAUTH_SECRET/" .secrets.prod
```

---

## 📞 Support

- Docs: `PRODUCTION_READINESS.md`
- API Health: `GET /api/health`
- Logs: `docker compose logs app`
- Database: `npx prisma studio`

**Última atualização:** 2025-10-15  
**Próxima revisão:** 2025-11-15
