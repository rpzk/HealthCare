# Local Development Without Docker

This guide sets up local dev using system services (Node.js, PostgreSQL, Redis) and keeps Docker for production builds only.

## Prerequisites
- Linux with `apt`/`dnf` (or install equivalents manually)
- Node.js 22.x + npm
- PostgreSQL 15+ (database: `healthcare_db`, user: `healthcare`)
- Redis 7+

## Install Tooling (Ubuntu/Debian)
```bash
# Node.js 22 + npm
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL + Redis
sudo apt install -y postgresql redis-server
sudo systemctl enable --now postgresql
sudo systemctl enable --now redis-server

# Create DB and user
sudo -u postgres psql -c "CREATE ROLE healthcare LOGIN PASSWORD 'change_me';" || true
sudo -u postgres psql -c "CREATE DATABASE healthcare_db OWNER healthcare;" || true
```

## Configure Environment
Create `.env.development` in the repo root:
```
DATABASE_URL=postgresql://healthcare:change_me@localhost:5432/healthcare_db
NEXTAUTH_SECRET=dev_secret_replace_me
NEXTAUTH_URL=http://localhost:3000
ENCRYPTION_KEY=091f102918edce0e682e220705848ff064ec12d5f5c7b832038d64851d6d8b04
REDIS_HOST=localhost
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```
Note: Adapt variables per `.env.example`. Avoid fake demo data.

## Install Dependencies and Prisma
```bash
npm ci
npx prisma generate
# Migrate schema
npx prisma migrate dev --name init-local
```

## Run Dev Server
```bash
npm run dev
# Then open http://localhost:3000
```

## Smoke Checks
- `/api/health` returns status JSON
- Patients and records pages render
- Authentication via NextAuth works with credentials configured in DB

## Production
Use `docker-compose.prod.yml` for production builds:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

